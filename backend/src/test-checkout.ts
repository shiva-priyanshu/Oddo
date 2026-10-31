import { app } from './app';
import { prisma } from './lib/prisma';
import { signToken } from './lib/jwt';
import { EventEmitter } from 'events';

// In-process HTTP dispatcher
function dispatch(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req = new EventEmitter() as any;
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.path = url.split('?')[0];
    req.query = {};
    req.headers = { ...headers };
    if (body) {
      req.headers['content-type'] = 'application/json';
    }
    req.get = (header: string) => req.headers[header.toLowerCase()];
    req.header = req.get;
    req.body = body;

    const res = new EventEmitter() as any;
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (k: string, v: string) => {
      res.headers[k.toLowerCase()] = v;
    };
    res.getHeader = (k: string) => res.headers[k.toLowerCase()];
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };

    let responseData = '';
    res.write = (chunk: any) => {
      responseData += chunk;
      return true;
    };
    res.end = (chunk: any) => {
      if (chunk) responseData += chunk;
      let parsed = responseData;
      try {
        parsed = JSON.parse(responseData);
      } catch {
        // raw text
      }
      resolve({ status: res.statusCode, body: parsed });
    };
    res.json = (json: any) => {
      res.setHeader('content-type', 'application/json');
      resolve({ status: res.statusCode, body: json });
    };
    res.send = (data: any) => {
      if (typeof data === 'object') {
        resolve({ status: res.statusCode, body: data });
      } else {
        res.end(data);
      }
    };

    (app as any).handle(req, res, (err: any) => {
      if (err) {
        resolve({
          status: 500,
          body: { error: err.message || 'Internal Server Error', statusCode: 500 },
        });
      }
    });
  });
}

async function runCheckoutTests() {
  console.log('====================================================');
  console.log('SubscriptIQ Subscription Checkout & Payment Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Unauthenticated request to /api/subscriptions/checkout returns HTTP 401
    const unauthRes = await dispatch('POST', '/api/subscriptions/checkout', {}, {
      planId: 'any-plan-id',
    });
    assert(
      '1. Unauthenticated checkout returns HTTP 401 Unauthorized',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );

    // Setup test customers
    const acmeCustomer = await prisma.customer.findUnique({ where: { email: 'acme@example.com' } });
    const globexCustomer = await prisma.customer.findUnique({ where: { email: 'globex@example.com' } });
    if (!acmeCustomer || !globexCustomer) {
      throw new Error('Seeded customers not found. Run seed script first.');
    }

    const acmeToken = signToken({
      userId: acmeCustomer.userId || 'acme-user',
      email: acmeCustomer.email,
      role: 'CUSTOMER',
      customerId: acmeCustomer.id,
    });

    const globexToken = signToken({
      userId: globexCustomer.userId || 'globex-user',
      email: globexCustomer.email,
      role: 'CUSTOMER',
      customerId: globexCustomer.id,
    });

    const adminToken = signToken({
      userId: 'admin-user',
      email: 'admin@subscriptiq.com',
      role: 'ADMIN',
    });

    // Create a unique active plan for this checkout test
    const checkoutTestPlan = await prisma.plan.create({
      data: {
        name: `Checkout Tier ${Date.now()}`,
        description: 'Plan for checkout verification testing',
        price: 49.0,
        billingInterval: 'MONTHLY',
        isActive: true,
        features: JSON.stringify(['Instant Setup', 'API Access']),
      },
    });

    // Create an inactive plan for testing
    const inactivePlan = await prisma.plan.create({
      data: {
        name: `Inactive Tier ${Date.now()}`,
        description: 'Archived tier',
        price: 99.0,
        billingInterval: 'MONTHLY',
        isActive: false,
        features: JSON.stringify(['Unavailable']),
      },
    });

    // 2. Non-existent Plan ID returns HTTP 404
    const notFoundPlanRes = await dispatch(
      'POST',
      '/api/subscriptions/checkout',
      { authorization: `Bearer ${acmeToken}` },
      { planId: 'non-existent-plan-id-123' }
    );
    assert(
      '2. Non-existent plan returns HTTP 404 Plan not found',
      notFoundPlanRes.status === 404 && notFoundPlanRes.body.error === 'Plan not found',
      `Status: ${notFoundPlanRes.status}`
    );

    // 3. Inactive Plan returns HTTP 400
    const inactiveRes = await dispatch(
      'POST',
      '/api/subscriptions/checkout',
      { authorization: `Bearer ${acmeToken}` },
      { planId: inactivePlan.id }
    );
    assert(
      '3. Inactive plan returns HTTP 400 Cannot subscribe to an inactive plan',
      inactiveRes.status === 400 && inactiveRes.body.error === 'Cannot subscribe to an inactive plan',
      `Status: ${inactiveRes.status}`
    );

    // 4. Authorization / Tenant Isolation: Customer A cannot purchase for Customer B
    const crossCustomerRes = await dispatch(
      'POST',
      '/api/subscriptions/checkout',
      { authorization: `Bearer ${acmeToken}` },
      {
        planId: checkoutTestPlan.id,
        customerId: globexCustomer.id, // Acme attempting to bill on Globex
      }
    );
    assert(
      '4. Customer purchasing on behalf of another customer returns HTTP 403 Forbidden',
      crossCustomerRes.status === 403 &&
        crossCustomerRes.body.error.includes('cannot purchase a subscription on behalf of another customer'),
      `Status: ${crossCustomerRes.status}, Body: ${JSON.stringify(crossCustomerRes.body)}`
    );

    // 5. Simulated Payment Failure (simulateFailure: true) returns HTTP 402 Payment Required
    const failRes = await dispatch(
      'POST',
      '/api/subscriptions/checkout',
      { authorization: `Bearer ${acmeToken}` },
      {
        planId: checkoutTestPlan.id,
        paymentMethod: 'SIMULATED_CARD',
        simulateFailure: true,
      }
    );
    assert(
      '5. Simulated payment failure injection returns HTTP 402 with failure message',
      failRes.status === 402 &&
        failRes.body.error.includes('Simulated payment failed'),
      `Status: ${failRes.status}, Body: ${JSON.stringify(failRes.body)}`
    );

    // 6. Successful Checkout: Saves Subscription, Invoice, and Payment record atomically
    const checkoutSuccessRes = await dispatch(
      'POST',
      '/api/subscriptions/checkout',
      { authorization: `Bearer ${acmeToken}` },
      {
        planId: checkoutTestPlan.id,
        paymentMethod: 'SIMULATED_CARD',
      }
    );
    assert(
      '6. Successful checkout returns HTTP 201 with active subscription and settled invoice',
      checkoutSuccessRes.status === 201 &&
        checkoutSuccessRes.body.success === true &&
        checkoutSuccessRes.body.subscription.status === 'ACTIVE' &&
        checkoutSuccessRes.body.invoice.status === 'PAID' &&
        checkoutSuccessRes.body.payment.paymentMethod === 'SIMULATED' &&
        checkoutSuccessRes.body.payment.amount === checkoutSuccessRes.body.invoice.total &&
        checkoutSuccessRes.body.remainingBalance === 0,
      `Status: ${checkoutSuccessRes.status}, Body: ${JSON.stringify(checkoutSuccessRes.body)}`
    );
    const createdSubId = checkoutSuccessRes.body.subscription.id;
    const createdInvoiceId = checkoutSuccessRes.body.invoice.id;

    // 7. Duplicate Prevention: Attempting to subscribe again to the same active plan returns HTTP 409
    const duplicateRes = await dispatch(
      'POST',
      '/api/subscriptions/checkout',
      { authorization: `Bearer ${acmeToken}` },
      {
        planId: checkoutTestPlan.id,
        paymentMethod: 'SIMULATED_CARD',
      }
    );
    assert(
      '7. Repeated checkout on same active plan returns HTTP 409 duplicate prevention',
      duplicateRes.status === 409 &&
        duplicateRes.body.error.includes('already actively subscribed'),
      `Status: ${duplicateRes.status}`
    );

    // 8. Database Persistence & Reconciliation Check
    const dbSub = await prisma.subscription.findUnique({
      where: { id: createdSubId },
      include: {
        plan: true,
        invoices: {
          include: { payments: true, items: true },
        },
      },
    });
    assert(
      '8. Database state matches: Subscription is ACTIVE, Invoice is PAID, and Payment is persisted',
      !!dbSub &&
        dbSub.status === 'ACTIVE' &&
        dbSub.invoices.length >= 1 &&
        dbSub.invoices[0].status === 'PAID' &&
        dbSub.invoices[0].payments.length >= 1 &&
        dbSub.invoices[0].payments[0].amount === dbSub.invoices[0].total &&
        dbSub.invoices[0].items.length >= 1,
      `DB Sub: ${JSON.stringify(dbSub)}`
    );

    // 9. Customer Invoices list reflects the newly paid checkout invoice
    const customerInvoicesRes = await dispatch(
      'GET',
      '/api/invoices',
      { authorization: `Bearer ${acmeToken}` }
    );
    const hasPaidInvoice = customerInvoicesRes.body.invoices?.some(
      (inv: any) => inv.id === createdInvoiceId && inv.liveStatus === 'PAID' && inv.remainingBalance === 0
    );
    assert(
      '9. Customer invoice directory immediately reflects paid checkout invoice with 0 balance',
      customerInvoicesRes.status === 200 && hasPaidInvoice,
      `Found invoice in customer view: ${hasPaidInvoice}`
    );

    // 10. Clean up test plan, subscription, invoice, and payment
    await prisma.payment.deleteMany({ where: { invoiceId: createdInvoiceId } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: createdInvoiceId } });
    await prisma.invoice.deleteMany({ where: { id: createdInvoiceId } });
    await prisma.subscription.deleteMany({ where: { id: createdSubId } });
    await prisma.plan.deleteMany({ where: { id: { in: [checkoutTestPlan.id, inactivePlan.id] } } });

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`Checkout Test Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runCheckoutTests();
