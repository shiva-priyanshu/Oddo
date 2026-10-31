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
  console.log('SubscriptIQ Executive Dashboard & Analytics Test Suite');
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

  // 1. Admin GET /api/dashboard/stats returns HTTP 200 with required top-level keys
  const adminStatsRes = await dispatch(
    'GET',
    '/api/dashboard/stats',
    { authorization: `Bearer ${adminToken}` }
  );

  assert(
    '1. Admin GET /api/dashboard/stats returns HTTP 200 with metrics, planDistribution, upcomingRenewals, activityFeed',
    adminStatsRes.status === 200 &&
      !!adminStatsRes.body.metrics &&
      Array.isArray(adminStatsRes.body.planDistribution) &&
      Array.isArray(adminStatsRes.body.upcomingRenewals) &&
      Array.isArray(adminStatsRes.body.activityFeed),
    `Status: ${adminStatsRes.status}`
  );

  const metrics = adminStatsRes.body.metrics;

  // 2. Verify MRR and ARR calculations
  // Query active subscriptions from db to verify math
  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { plan: true },
  });

  let expectedMrr = 0;
  for (const s of activeSubs) {
    if (s.plan.billingInterval === 'MONTHLY') {
      expectedMrr += s.plan.price;
    } else if (s.plan.billingInterval === 'YEARLY') {
      expectedMrr += s.plan.price / 12;
    }
  }
  expectedMrr = Math.round(expectedMrr * 100) / 100;
  const expectedArr = Math.round(expectedMrr * 12 * 100) / 100;

  assert(
    '2. MRR and ARR are computed accurately from active subscriptions (monthly + yearly / 12)',
    metrics.mrr === expectedMrr && metrics.arr === expectedArr,
    `Expected MRR: ${expectedMrr}, Got: ${metrics.mrr}. Expected ARR: ${expectedArr}, Got: ${metrics.arr}`
  );

  // 3. Verify customer count and active subscriptions count
  const expectedCustomerCount = await prisma.customer.count();
  assert(
    '3. Total customers and active subscriptions counts match database records',
    metrics.totalCustomers === expectedCustomerCount &&
      metrics.activeSubscriptionsCount === activeSubs.length,
    `Customers: ${metrics.totalCustomers} (expected ${expectedCustomerCount}), Active Subs: ${metrics.activeSubscriptionsCount}`
  );

  // 4. Verify invoices breakdown exists and includes counts & amounts
  assert(
    '4. Invoices breakdown reports unpaid, overdue, and paid counts and totals',
    typeof metrics.invoices?.unpaidCount === 'number' &&
      typeof metrics.invoices?.overdueCount === 'number' &&
      typeof metrics.invoices?.paidCount === 'number' &&
      typeof metrics.totalCollectedRevenue === 'number' &&
      metrics.totalCollectedRevenue > 0,
    `Invoices: ${JSON.stringify(metrics.invoices)}, Collected: ${metrics.totalCollectedRevenue}`
  );

  // 5. Verify plan distribution contains active tiers
  assert(
    '5. Plan tier distribution categorizes subscribers and revenue contribution per plan',
    adminStatsRes.body.planDistribution.length > 0 &&
      adminStatsRes.body.planDistribution.every(
        (p: any) => p.name && p.price > 0 && p.subscribers >= 0 && typeof p.revenue === 'number'
      ),
    `Plan distribution: ${JSON.stringify(adminStatsRes.body.planDistribution)}`
  );

  // 6. Verify upcoming renewals list includes countdown and urgency flag
  assert(
    '6. Upcoming renewals list includes countdown days and 7-day urgency flag',
    adminStatsRes.body.upcomingRenewals.every(
      (r: any) =>
        r.subscriptionId &&
        r.customerName &&
        r.planName &&
        typeof r.daysUntilRenewal === 'number' &&
        typeof r.isUrgent7Day === 'boolean'
    ),
    `Upcoming renewals: ${JSON.stringify(adminStatsRes.body.upcomingRenewals)}`
  );

  // 7. Verify activity feed synthesizes recent events chronologically
  const activityFeed = adminStatsRes.body.activityFeed;
  let isSorted = true;
  for (let i = 1; i < activityFeed.length; i++) {
    if (new Date(activityFeed[i - 1].timestamp).getTime() < new Date(activityFeed[i].timestamp).getTime()) {
      isSorted = false;
      break;
    }
  }
  assert(
    '7. Activity feed contains events sorted descending by timestamp',
    activityFeed.length > 0 &&
      isSorted &&
      activityFeed.every((e: any) => e.type && e.title && e.description),
    `Feed count: ${activityFeed.length}`
  );

  // 8. Non-admin (Customer token) accessing /api/dashboard/stats returns HTTP 403 Forbidden
  const custForbiddenRes = await dispatch(
    'GET',
    '/api/dashboard/stats',
    { authorization: `Bearer ${acmeToken}` }
  );
  assert(
    '8. Customer accessing /api/dashboard/stats returns HTTP 403 Forbidden',
    custForbiddenRes.status === 403,
    `Status: ${custForbiddenRes.status}`
  );

  // 9. Unauthenticated request returns HTTP 401 Unauthorized
  const unauthRes = await dispatch('GET', '/api/dashboard/stats');
  assert(
    '9. Unauthenticated request to /api/dashboard/stats returns HTTP 401 Unauthorized',
    unauthRes.status === 401,
    `Status: ${unauthRes.status}`
  );

  // 10. Customer GET /api/dashboard/customer-summary returns HTTP 200 with customer-scoped data
  const custSummaryRes = await dispatch(
    'GET',
    '/api/dashboard/customer-summary',
    { authorization: `Bearer ${acmeToken}` }
  );
  assert(
    '10. Customer GET /api/dashboard/customer-summary returns HTTP 200 with subscription, financials, and recent invoices',
    custSummaryRes.status === 200 &&
      custSummaryRes.body.customer?.email === 'acme@example.com' &&
      !!custSummaryRes.body.activeSubscription &&
      typeof custSummaryRes.body.activeSubscription.daysUntilRenewal === 'number' &&
      typeof custSummaryRes.body.financials?.totalInvoiced === 'number' &&
      Array.isArray(custSummaryRes.body.recentInvoices),
    `Status: ${custSummaryRes.status}, Body: ${JSON.stringify(custSummaryRes.body)}`
  );

  // 11. Admin accessing customer summary without customerId returns HTTP 403
  const adminCustSummaryRes = await dispatch(
    'GET',
    '/api/dashboard/customer-summary',
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    '11. Accessing /api/dashboard/customer-summary without customer role/profile returns HTTP 403',
    adminCustSummaryRes.status === 403,
    `Status: ${adminCustSummaryRes.status}`
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
    console.error('Fatal error in dashboard test runner:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
