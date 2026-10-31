import { app } from './app';
import { prisma } from './lib/prisma';
import { signToken } from './lib/jwt';
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
  console.log('SubscriptIQ Plans & Subscriptions Test Suite');
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

  // Tokens
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

  let createdPlanId = '';
  let createdCustomerId = '';
  let createdSubId = '';

  try {
    // 1. Admin creates a new plan "Growth" ($79/mo)
    const createPlanRes = await dispatch(
      'POST',
      '/api/plans',
      { authorization: `Bearer ${adminToken}` },
      {
        name: 'Growth',
        description: 'Scalable subscription plan for expanding businesses',
        price: 79.0,
        currency: 'USD',
        billingInterval: 'MONTHLY',
        features: ['Up to 5,000 subscribers', 'Advanced analytics', 'Priority API'],
      }
    );
    assert(
      '1. Admin creates "Growth" plan ($79/mo) returns HTTP 201',
      createPlanRes.status === 201 &&
        createPlanRes.body.plan.name === 'Growth' &&
        createPlanRes.body.plan.price === 79 &&
        createPlanRes.body.plan.isActive === true,
      `Status: ${createPlanRes.status}, Body: ${JSON.stringify(createPlanRes.body)}`
    );
    createdPlanId = createPlanRes.body.plan.id;

    // 2. Admin updates the plan
    const updatePlanRes = await dispatch(
      'PUT',
      `/api/plans/${createdPlanId}`,
      { authorization: `Bearer ${adminToken}` },
      {
        description: 'Updated description for Growth plan',
      }
    );
    assert(
      '2. Admin updates plan description returns HTTP 200',
      updatePlanRes.status === 200 &&
        updatePlanRes.body.plan.description === 'Updated description for Growth plan',
      `Status: ${updatePlanRes.status}`
    );

    // 3. Admin toggles active status off
    const toggleOffRes = await dispatch(
      'PATCH',
      `/api/plans/${createdPlanId}/toggle`,
      { authorization: `Bearer ${adminToken}` }
    );
    assert(
      '3. Admin toggles plan to inactive returns HTTP 200 with isActive: false',
      toggleOffRes.status === 200 && toggleOffRes.body.plan.isActive === false,
      `Status: ${toggleOffRes.status}`
    );

    // 4. Attempting to subscribe a customer to an inactive plan returns HTTP 400
    const inactiveSubRes = await dispatch(
      'POST',
      '/api/subscriptions',
      { authorization: `Bearer ${adminToken}` },
      {
        customerId: acmeCustomer.id,
        planId: createdPlanId,
      }
    );
    assert(
      '4. Subscribing to an inactive plan returns HTTP 400',
      inactiveSubRes.status === 400 &&
        inactiveSubRes.body.error === 'Cannot subscribe to an inactive plan',
      `Status: ${inactiveSubRes.status}`
    );

    // 5. Admin toggles plan back on
    const toggleOnRes = await dispatch(
      'PATCH',
      `/api/plans/${createdPlanId}/toggle`,
      { authorization: `Bearer ${adminToken}` }
    );
    assert(
      '5. Admin toggles plan to active returns HTTP 200 with isActive: true',
      toggleOnRes.status === 200 && toggleOnRes.body.plan.isActive === true,
      `Status: ${toggleOnRes.status}`
    );

    // 6. Admin creates a new customer "Starlight Inc"
    const uniqueEmail = `starlight_${Date.now()}@example.com`;
    const createCustRes = await dispatch(
      'POST',
      '/api/customers',
      { authorization: `Bearer ${adminToken}` },
      {
        name: 'Elena Rostova',
        email: uniqueEmail,
        companyName: 'Starlight Inc',
        billingAddress: '450 Nebula Ave, Seattle, WA',
        phone: '+1 (555) 392-1092',
      }
    );
    assert(
      '6. Admin creates customer "Starlight Inc" returns HTTP 201',
      createCustRes.status === 201 &&
        createCustRes.body.customer.companyName === 'Starlight Inc',
      `Status: ${createCustRes.status}`
    );
    createdCustomerId = createCustRes.body.customer.id;

    // 7. Admin subscribes "Starlight Inc" to "Growth" plan (MONTHLY)
    const startDate = new Date('2026-03-01T00:00:00Z');
    const createSubRes = await dispatch(
      'POST',
      '/api/subscriptions',
      { authorization: `Bearer ${adminToken}` },
      {
        customerId: createdCustomerId,
        planId: createdPlanId,
        startDate: startDate.toISOString(),
      }
    );
    const subEnd = new Date(createSubRes.body.subscription?.currentPeriodEnd);
    assert(
      '7. Subscription created: ACTIVE with currentPeriodEnd forward 1 month',
      createSubRes.status === 201 &&
        createSubRes.body.subscription.status === 'ACTIVE' &&
        subEnd.getUTCMonth() === 3 && // April is month index 3 (March is 2)
        subEnd.getUTCDate() === 1,
      `Status: ${createSubRes.status}, PeriodEnd: ${createSubRes.body.subscription?.currentPeriodEnd}`
    );
    createdSubId = createSubRes.body.subscription.id;

    // 8. Admin subscribes to an annual plan: currentPeriodEnd forward 1 year
    const enterprisePlan = await prisma.plan.findFirst({ where: { billingInterval: 'YEARLY' } });
    if (enterprisePlan) {
      const yearlySubRes = await dispatch(
        'POST',
        '/api/subscriptions',
        { authorization: `Bearer ${adminToken}` },
        {
          customerId: createdCustomerId,
          planId: enterprisePlan.id,
          startDate: startDate.toISOString(),
        }
      );
      const yearlyEnd = new Date(yearlySubRes.body.subscription?.currentPeriodEnd);
      assert(
        '8. Annual subscription: currentPeriodEnd forward exactly 1 year (2027)',
        yearlySubRes.status === 201 &&
          yearlyEnd.getUTCFullYear() === 2027 &&
          yearlyEnd.getUTCMonth() === 2 &&
          yearlyEnd.getUTCDate() === 1,
        `Status: ${yearlySubRes.status}, End: ${yearlySubRes.body.subscription?.currentPeriodEnd}`
      );
      // Clean up second sub
      await prisma.subscription.delete({ where: { id: yearlySubRes.body.subscription.id } });
    }

    // 9. Customer accesses their own subscriptions
    const customerSubsRes = await dispatch(
      'GET',
      '/api/subscriptions',
      { authorization: `Bearer ${acmeToken}` }
    );
    assert(
      '9. Customer retrieves own subscriptions returns HTTP 200',
      customerSubsRes.status === 200 &&
        Array.isArray(customerSubsRes.body.subscriptions) &&
        customerSubsRes.body.subscriptions.every(
          (s: any) => s.customerId === acmeCustomer.id
        ),
      `Status: ${customerSubsRes.status}`
    );

    // 10. Customer attempts to cancel another customer's subscription (HTTP 403)
    const crossCancelRes = await dispatch(
      'PATCH',
      `/api/subscriptions/${createdSubId}/cancel`,
      { authorization: `Bearer ${acmeToken}` },
      { immediate: true }
    );
    assert(
      "10. Customer cancelling another customer subscription returns HTTP 403",
      crossCancelRes.status === 403 &&
        crossCancelRes.body.error ===
          'Access forbidden: cannot modify another customer subscription',
      `Status: ${crossCancelRes.status}`
    );

    // 11. Admin schedules cancellation at period end
    const cancelPeriodEndRes = await dispatch(
      'PATCH',
      `/api/subscriptions/${createdSubId}/cancel`,
      { authorization: `Bearer ${adminToken}` },
      { immediate: false }
    );
    assert(
      '11. Schedule cancellation at period end sets cancelAtPeriodEnd: true',
      cancelPeriodEndRes.status === 200 &&
        cancelPeriodEndRes.body.subscription.cancelAtPeriodEnd === true,
      `Status: ${cancelPeriodEndRes.status}`
    );

    // 12. Immediate cancellation sets status: 'CANCELLED'
    const cancelImmediateRes = await dispatch(
      'PATCH',
      `/api/subscriptions/${createdSubId}/cancel`,
      { authorization: `Bearer ${adminToken}` },
      { immediate: true }
    );
    assert(
      '12. Immediate cancellation sets status to CANCELLED',
      cancelImmediateRes.status === 200 &&
        cancelImmediateRes.body.subscription.status === 'CANCELLED',
      `Status: ${cancelImmediateRes.status}`
    );

    // Clean up created test entities
    if (createdSubId) {
      await prisma.subscription.deleteMany({ where: { id: createdSubId } });
    }
    if (createdCustomerId) {
      await prisma.customer.deleteMany({ where: { id: createdCustomerId } });
    }
    if (createdPlanId) {
      await prisma.plan.deleteMany({ where: { id: createdPlanId } });
    }
  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
