import { app } from './app';
import { prisma } from './lib/prisma';
import { signToken } from './lib/jwt';
import { EventEmitter } from 'events';

// In-process HTTP request simulator for sandbox-safe end-to-end testing
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
        // keep raw text
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

    // Dispatch directly through Express application stack
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
  console.log('SubscriptIQ Security & RBAC Automated Test Suite');
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
    // Query known seeded customer IDs for data isolation tests
    const acmeCustomer = await prisma.customer.findUnique({
      where: { email: 'acme@example.com' },
    });
    const globexCustomer = await prisma.customer.findUnique({
      where: { email: 'globex@example.com' },
    });

    if (!acmeCustomer || !globexCustomer) {
      throw new Error('Seeded customers not found in dev.db. Run seed script first.');
    }

    // 1. Valid Admin Login
    const adminLoginRes = await dispatch('POST', '/api/auth/login', {}, {
      email: 'admin@subscriptiq.com',
      password: 'admin123',
    });
    assert(
      '1. Valid Admin Login returns HTTP 200 with JWT and role ADMIN',
      adminLoginRes.status === 200 &&
        typeof adminLoginRes.body.token === 'string' &&
        adminLoginRes.body.user.role === 'ADMIN' &&
        !adminLoginRes.body.user.passwordHash,
      `Status: ${adminLoginRes.status}, Body: ${JSON.stringify(adminLoginRes.body)}`
    );
    const adminToken = adminLoginRes.body.token;

    // 2. Valid Customer Login
    const customerLoginRes = await dispatch('POST', '/api/auth/login', {}, {
      email: 'acme@example.com',
      password: 'customer123',
    });
    assert(
      '2. Valid Customer Login returns HTTP 200 with JWT and role CUSTOMER',
      customerLoginRes.status === 200 &&
        typeof customerLoginRes.body.token === 'string' &&
        customerLoginRes.body.user.role === 'CUSTOMER' &&
        customerLoginRes.body.user.customerId === acmeCustomer.id &&
        !customerLoginRes.body.user.passwordHash,
      `Status: ${customerLoginRes.status}`
    );
    const customerToken = customerLoginRes.body.token;

    // 3. Invalid Password
    const invalidPassRes = await dispatch('POST', '/api/auth/login', {}, {
      email: 'admin@subscriptiq.com',
      password: 'wrongpassword',
    });
    assert(
      '3. Invalid password returns HTTP 401 with generic message',
      invalidPassRes.status === 401 &&
        invalidPassRes.body.error === 'Invalid email or password',
      `Status: ${invalidPassRes.status}`
    );

    // 4. Non-Existent User
    const unknownUserRes = await dispatch('POST', '/api/auth/login', {}, {
      email: 'nobody@example.com',
      password: 'password123',
    });
    assert(
      '4. Non-existent email returns HTTP 401 with generic message',
      unknownUserRes.status === 401 &&
        unknownUserRes.body.error === 'Invalid email or password',
      `Status: ${unknownUserRes.status}`
    );

    // 5. Missing Bearer Token on Protected Route
    const missingTokenRes = await dispatch('GET', '/api/auth/me');
    assert(
      '5. Missing token on /api/auth/me returns HTTP 401',
      missingTokenRes.status === 401 &&
        missingTokenRes.body.error === 'Authentication token required',
      `Status: ${missingTokenRes.status}`
    );

    // 6. Expired Token
    const expiredToken = signToken(
      {
        userId: 'test-user',
        email: 'test@example.com',
        role: 'CUSTOMER',
      },
      -100 // Expired 100 seconds ago
    );
    const expiredRes = await dispatch('GET', '/api/auth/me', {
      authorization: `Bearer ${expiredToken}`,
    });
    assert(
      '6. Expired JWT returns HTTP 401',
      expiredRes.status === 401 &&
        expiredRes.body.error === 'Authentication token expired',
      `Status: ${expiredRes.status}, Body: ${JSON.stringify(expiredRes.body)}`
    );

    // 7. Tampered Signature
    const tamperedToken = `${customerToken.substring(0, customerToken.lastIndexOf('.'))}.invalidSignature`;
    const tamperedRes = await dispatch('GET', '/api/auth/me', {
      authorization: `Bearer ${tamperedToken}`,
    });
    assert(
      '7. Tampered token signature returns HTTP 401',
      tamperedRes.status === 401 &&
        tamperedRes.body.error === 'Invalid authentication token',
      `Status: ${tamperedRes.status}`
    );

    // 8. Role Boundary: Customer accessing ADMIN route
    const roleForbiddenRes = await dispatch('GET', '/api/auth/admin-only', {
      authorization: `Bearer ${customerToken}`,
    });
    assert(
      '8. Customer accessing ADMIN route returns HTTP 403 Forbidden',
      roleForbiddenRes.status === 403 &&
        roleForbiddenRes.body.error === 'Access forbidden: insufficient permissions',
      `Status: ${roleForbiddenRes.status}`
    );

    // 9. Role Boundary: Admin accessing ADMIN route
    const roleAllowedRes = await dispatch('GET', '/api/auth/admin-only', {
      authorization: `Bearer ${adminToken}`,
    });
    assert(
      '9. Admin accessing ADMIN route returns HTTP 200 OK',
      roleAllowedRes.status === 200 && roleAllowedRes.body.authorized === true,
      `Status: ${roleAllowedRes.status}`
    );

    // 10. Customer Data Isolation: Customer 1 accessing Own Data
    const ownDataRes = await dispatch(
      'GET',
      `/api/auth/customer-data/${acmeCustomer.id}`,
      { authorization: `Bearer ${customerToken}` }
    );
    assert(
      "10. Customer accessing own customerId returns HTTP 200 OK",
      ownDataRes.status === 200 && ownDataRes.body.authorized === true,
      `Status: ${ownDataRes.status}`
    );

    // 11. Customer Data Isolation: Customer 1 accessing Customer 2 Data
    const crossCustomerRes = await dispatch(
      'GET',
      `/api/auth/customer-data/${globexCustomer.id}`,
      { authorization: `Bearer ${customerToken}` }
    );
    assert(
      "11. Customer accessing another customerId returns HTTP 403 Forbidden",
      crossCustomerRes.status === 403 &&
        crossCustomerRes.body.error === 'Access forbidden: cannot access another customer data',
      `Status: ${crossCustomerRes.status}`
    );

    // 12. Admin Cross-Customer Access
    const adminCustomerAccessRes = await dispatch(
      'GET',
      `/api/auth/customer-data/${globexCustomer.id}`,
      { authorization: `Bearer ${adminToken}` }
    );
    assert(
      "12. Admin accessing any customerId returns HTTP 200 OK",
      adminCustomerAccessRes.status === 200 && adminCustomerAccessRes.body.authorized === true,
      `Status: ${adminCustomerAccessRes.status}`
    );

    // 13. Registration Role Escalation Guard
    const uniqueEmail = `newcustomer_${Date.now()}@example.com`;
    const regRes = await dispatch('POST', '/api/auth/register-customer', {}, {
      name: 'Security Test Customer',
      email: uniqueEmail,
      password: 'password123',
      role: 'ADMIN', // Attacker attempts to escalate role
      companyName: 'Escalation Test Corp',
    });
    assert(
      "13. Public registration strictly assigns role CUSTOMER (rejects/ignores ADMIN escalation)",
      regRes.status === 201 &&
        regRes.body.user.role === 'CUSTOMER' &&
        regRes.body.user.role !== 'ADMIN',
      `Status: ${regRes.status}, Role: ${regRes.body?.user?.role}`
    );

    // Clean up test customer from registration test
    if (regRes.body?.user?.id) {
      await prisma.customer.deleteMany({ where: { userId: regRes.body.user.id } });
      await prisma.user.deleteMany({ where: { id: regRes.body.user.id } });
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
