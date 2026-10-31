import { app } from './app';
import { prisma } from './lib/prisma';
import { signToken } from './lib/jwt';
import {
  calculateInvoiceFinancials,
  generateNextInvoiceNumber,
  computeLiveInvoiceStatus,
} from './lib/invoice-calc';
import { EventEmitter } from 'events';

// In-process HTTP request simulator for sandbox-safe testing
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
    const [path, queryString] = url.split('?');
    req.path = path;
    req.query = {};
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      for (const [key, value] of searchParams.entries()) {
        req.query[key] = value;
      }
    }
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
        // keep text
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

async function runTests() {
  console.log('====================================================');
  console.log('SubscriptIQ Billing & Invoicing Test Suite');
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

  // 1. Unit Test: calculateInvoiceFinancials arithmetic & 2-decimal rounding
  const calc1 = calculateInvoiceFinancials(
    [
      { unitPrice: 49.99, quantity: 2 },
      { unitPrice: 15.5, quantity: 1 },
    ],
    10.0, // $10 discount
    10.0  // 10% tax
  );
  // subtotal: 49.99 * 2 + 15.5 = 99.98 + 15.5 = 115.48
  // taxable: 115.48 - 10 = 105.48
  // tax: 105.48 * 0.1 = 10.548 -> 10.55
  // total: 105.48 + 10.55 = 116.03
  assert(
    '1. Financial calculation engine computes subtotal, discount, tax, and total with 2-decimal rounding',
    calc1.subtotal === 115.48 &&
      calc1.discountAmount === 10.0 &&
      calc1.taxAmount === 10.55 &&
      calc1.total === 116.03,
    `Got: ${JSON.stringify(calc1)}`
  );

  // 2. Unit Test: generateNextInvoiceNumber format
  const nextInvNum = await generateNextInvoiceNumber();
  const year = new Date().getFullYear();
  assert(
    '2. generateNextInvoiceNumber returns sequential number matching INV-YYYY-xxxx',
    new RegExp(`^INV-${year}-\\d{4}$`).test(nextInvNum),
    `Generated: ${nextInvNum}`
  );

  // Seeded customers & tokens
  const adminToken = signToken({
    userId: 'admin-test-id',
    email: 'admin@subscriptiq.com',
    role: 'ADMIN',
  });

  const acmeCustomer = await prisma.customer.findUnique({
    where: { email: 'acme@example.com' },
  });
  const globexCustomer = await prisma.customer.findUnique({
    where: { email: 'globex@example.com' },
  });

  if (!acmeCustomer || !globexCustomer) {
    throw new Error('Seeded customers not found in dev.db.');
  }

  const acmeToken = signToken({
    userId: 'acme-user-id',
    email: 'acme@example.com',
    role: 'CUSTOMER',
    customerId: acmeCustomer.id,
  });

  const globexToken = signToken({
    userId: 'globex-user-id',
    email: 'globex@example.com',
    role: 'CUSTOMER',
    customerId: globexCustomer.id,
  });

  // 3. Automated invoice creation upon subscription
  // Find an active plan (e.g. Pro Plan, $49)
  const proPlan = await prisma.plan.findFirst({
    where: { name: 'Pro', isActive: true },
  });
  if (!proPlan) {
    throw new Error('Pro plan not found in database.');
  }

  // Create a new customer for isolated billing testing
  const testCustomerEmail = `billing_cust_${Date.now()}@example.com`;
  const newCustRes = await dispatch(
    'POST',
    '/api/customers',
    { authorization: `Bearer ${adminToken}` },
    {
      name: 'Arthur Pendelton',
      email: testCustomerEmail,
      companyName: 'Pendelton Corp',
      billingAddress: '100 King Arthur Way, Boston, MA',
    }
  );
  assert(
    '3. Admin creates customer for billing lifecycle test',
    newCustRes.status === 201 && !!newCustRes.body.customer?.id,
    `Status: ${newCustRes.status}`
  );
  const testCustomerId = newCustRes.body.customer.id;

  const testCustToken = signToken({
    userId: `cust-user-${Date.now()}`,
    email: testCustomerEmail,
    role: 'CUSTOMER',
    customerId: testCustomerId,
  });

  // Subscribe customer to Pro plan
  const subStart = new Date('2026-04-01T00:00:00Z');
  const createSubRes = await dispatch(
    'POST',
    '/api/subscriptions',
    { authorization: `Bearer ${adminToken}` },
    {
      customerId: testCustomerId,
      planId: proPlan.id,
      startDate: subStart.toISOString(),
    }
  );

  assert(
    '4. Creating subscription automatically creates an initial UNPAID invoice',
    createSubRes.status === 201 &&
      !!createSubRes.body.invoice &&
      createSubRes.body.invoice.status === 'UNPAID' &&
      createSubRes.body.invoice.subtotal === proPlan.price &&
      createSubRes.body.invoice.total === Math.round(proPlan.price * 1.1 * 100) / 100,
    `Status: ${createSubRes.status}, Invoice: ${JSON.stringify(createSubRes.body.invoice)}`
  );
  const autoInvoiceId = createSubRes.body.invoice.id;

  // 5. Query /api/invoices as Customer -> returns only this customer's invoices
  const custInvoicesRes = await dispatch(
    'GET',
    '/api/invoices',
    { authorization: `Bearer ${testCustToken}` }
  );
  assert(
    '5. Customer can query invoices and sees only their own records',
    custInvoicesRes.status === 200 &&
      Array.isArray(custInvoicesRes.body.invoices) &&
      custInvoicesRes.body.invoices.length === 1 &&
      custInvoicesRes.body.invoices[0].customerId === testCustomerId,
    `Invoices count: ${custInvoicesRes.body.invoices?.length}`
  );

  // 6. Cross-customer invoice access blocked (Customer attempts to get another customer's invoice)
  // Get Acme's invoice ID
  const acmeInvoice = await prisma.invoice.findFirst({
    where: { customerId: acmeCustomer.id },
  });
  if (!acmeInvoice) {
    throw new Error('Seeded Acme invoice not found.');
  }

  const crossAccessRes = await dispatch(
    'GET',
    `/api/invoices/${acmeInvoice.id}`,
    { authorization: `Bearer ${testCustToken}` }
  );
  assert(
    '6. Customer accessing another customer\'s invoice returns HTTP 403 Forbidden',
    crossAccessRes.status === 403 &&
      crossAccessRes.body.error.includes('forbidden'),
    `Status: ${crossAccessRes.status}, Error: ${crossAccessRes.body?.error}`
  );

  // 7. Unauthenticated request to /api/invoices returns HTTP 401
  const unauthRes = await dispatch('GET', '/api/invoices');
  assert(
    '7. Unauthenticated request to /api/invoices returns HTTP 401',
    unauthRes.status === 401,
    `Status: ${unauthRes.status}`
  );

  // 8. Admin creates ad-hoc custom invoice with line items
  const adHocDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const adHocRes = await dispatch(
    'POST',
    '/api/invoices',
    { authorization: `Bearer ${adminToken}` },
    {
      customerId: testCustomerId,
      dueDate: adHocDueDate,
      items: [
        { description: 'Custom Setup & Migration', unitPrice: 200, quantity: 1 },
        { description: 'Dedicated IP Addon', unitPrice: 25, quantity: 2 },
      ],
      discountAmount: 10,
      taxRate: 10.0,
    }
  );
  // subtotal: 200 + 50 = 250
  // discount: 10 -> taxable = 240
  // tax (10%): 24
  // total: 264
  assert(
    '8. Admin creates ad-hoc custom invoice with calculated subtotal, tax, and total',
    adHocRes.status === 201 &&
      adHocRes.body.invoice.subtotal === 250 &&
      adHocRes.body.invoice.taxAmount === 24 &&
      adHocRes.body.invoice.total === 264 &&
      adHocRes.body.invoice.items.length === 2,
    `Status: ${adHocRes.status}, Invoice: ${JSON.stringify(adHocRes.body.invoice)}`
  );
  const adHocInvoiceId = adHocRes.body.invoice.id;

  // 9. Customer attempting to create invoice returns HTTP 403
  const custCreateRes = await dispatch(
    'POST',
    '/api/invoices',
    { authorization: `Bearer ${testCustToken}` },
    {
      customerId: testCustomerId,
      dueDate: adHocDueDate,
      items: [{ description: 'Test', unitPrice: 10, quantity: 1 }],
    }
  );
  assert(
    '9. Non-admin attempting to create invoice returns HTTP 403 Forbidden',
    custCreateRes.status === 403,
    `Status: ${custCreateRes.status}`
  );

  // 10. Overdue live status calculation
  // Create an invoice with past due date
  const pastDueDate = new Date('2025-01-01T00:00:00Z');
  const overdueInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await generateNextInvoiceNumber(),
      customerId: testCustomerId,
      subtotal: 100,
      taxAmount: 10,
      total: 110,
      status: 'UNPAID',
      dueDate: pastDueDate,
      items: {
        create: {
          description: 'Past Due Test Item',
          unitPrice: 100,
          quantity: 1,
          amount: 100,
        },
      },
    },
  });

  const getOverdueRes = await dispatch(
    'GET',
    `/api/invoices/${overdueInvoice.id}`,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    '10. Past-due invoice with remaining balance dynamically reports liveStatus OVERDUE',
    getOverdueRes.status === 200 &&
      getOverdueRes.body.invoice.liveStatus === 'OVERDUE' &&
      getOverdueRes.body.invoice.remainingBalance === 110,
    `liveStatus: ${getOverdueRes.body.invoice?.liveStatus}, balance: ${getOverdueRes.body.invoice?.remainingBalance}`
  );

  // 11. Record Partial Simulated Payment
  // autoInvoice total is $53.90. Record partial payment of $20.00
  const partialPaymentRes = await dispatch(
    'POST',
    `/api/invoices/${autoInvoiceId}/payments`,
    { authorization: `Bearer ${adminToken}` },
    {
      amount: 20.0,
      paymentMethod: 'SIMULATED',
      transactionRef: 'SIM-TEST-PARTIAL-01',
    }
  );
  assert(
    '11. Recording partial payment updates remaining balance and retains UNPAID status',
    partialPaymentRes.status === 201 &&
      partialPaymentRes.body.isPaidInFull === false &&
      partialPaymentRes.body.paidAmount === 20.0 &&
      partialPaymentRes.body.remainingBalance === 33.9 &&
      partialPaymentRes.body.payment.transactionRef === 'SIM-TEST-PARTIAL-01',
    `Status: ${partialPaymentRes.status}, Body: ${JSON.stringify(partialPaymentRes.body)}`
  );

  // 12. Record Remaining Payment -> Transitions to PAID
  const fullPaymentRes = await dispatch(
    'POST',
    `/api/invoices/${autoInvoiceId}/payments`,
    { authorization: `Bearer ${adminToken}` },
    {
      amount: 33.9,
      paymentMethod: 'CREDIT_CARD',
    }
  );
  assert(
    '12. Recording remaining payment auto-transitions invoice status to PAID with remaining balance 0',
    fullPaymentRes.status === 201 &&
      fullPaymentRes.body.isPaidInFull === true &&
      fullPaymentRes.body.invoiceStatus === 'PAID' &&
      fullPaymentRes.body.remainingBalance === 0,
    `Status: ${fullPaymentRes.status}, Body: ${JSON.stringify(fullPaymentRes.body)}`
  );

  // 13. Attempting to record payment on already-paid invoice returns HTTP 400
  const overpayRes = await dispatch(
    'POST',
    `/api/invoices/${autoInvoiceId}/payments`,
    { authorization: `Bearer ${adminToken}` },
    {
      amount: 10.0,
      paymentMethod: 'SIMULATED',
    }
  );
  assert(
    '13. Attempting payment on already-paid invoice returns HTTP 400',
    overpayRes.status === 400 &&
      overpayRes.body.error === 'Invoice is already paid in full',
    `Status: ${overpayRes.status}, Error: ${overpayRes.body?.error}`
  );

  // 14. Customer attempting to record payment returns HTTP 403
  const custPayRes = await dispatch(
    'POST',
    `/api/invoices/${adHocInvoiceId}/payments`,
    { authorization: `Bearer ${testCustToken}` },
    {
      amount: 50.0,
      paymentMethod: 'SIMULATED',
    }
  );
  assert(
    '14. Customer attempting to record payment returns HTTP 403 Forbidden',
    custPayRes.status === 403,
    `Status: ${custPayRes.status}`
  );

  // 15. Verify payment audit history in GET /api/invoices/:id
  const verifiedInvoiceRes = await dispatch(
    'GET',
    `/api/invoices/${autoInvoiceId}`,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    '15. Invoice detail includes complete payment audit history with methods and timestamps',
    verifiedInvoiceRes.status === 200 &&
      verifiedInvoiceRes.body.invoice.status === 'PAID' &&
      Array.isArray(verifiedInvoiceRes.body.invoice.payments) &&
      verifiedInvoiceRes.body.invoice.payments.length === 2 &&
      verifiedInvoiceRes.body.invoice.payments[0].amount > 0,
    `Status: ${verifiedInvoiceRes.status}, Payments count: ${verifiedInvoiceRes.body.invoice?.payments?.length}`
  );

  console.log('\n====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Fatal error in billing test runner:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
