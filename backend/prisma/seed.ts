import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seeding for SubscriptIQ...');

  // Clean existing data in reverse relation order
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();

  // 1. Password Hashes (10 salt rounds)
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const customerPasswordHash = await bcrypt.hash('customer123', 10);

  // 2. Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@subscriptiq.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log(`[Seed] Created Admin user: ${admin.email}`);

  // 3. Pricing Plans
  const starterPlan = await prisma.plan.create({
    data: {
      name: 'Starter',
      description: 'Essential billing and subscription tools for emerging businesses.',
      price: 19.0,
      currency: 'USD',
      billingInterval: 'MONTHLY',
      isActive: true,
      features: JSON.stringify(['Up to 100 subscribers', 'Standard invoicing', 'Email support']),
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: 'Pro',
      description: 'Advanced subscription workflows with automated renewals and reporting.',
      price: 49.0,
      currency: 'USD',
      billingInterval: 'MONTHLY',
      isActive: true,
      features: JSON.stringify([
        'Unlimited subscribers',
        'Automated tax & discounts',
        'Custom invoice branding',
        'Priority support',
      ]),
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'Enterprise',
      description: 'Dedicated billing infrastructure, custom workflows, and annualized billing.',
      price: 199.0,
      currency: 'USD',
      billingInterval: 'YEARLY',
      isActive: true,
      features: JSON.stringify([
        'Everything in Pro',
        'Annual volume discounts',
        'Dedicated account manager',
        'Custom API limits',
      ]),
    },
  });
  console.log('[Seed] Created 3 plans: Starter, Pro, Enterprise');

  // 4. Customers & Linked Users
  // Customer 1: Acme Corp
  const acmeUser = await prisma.user.create({
    data: {
      email: 'acme@example.com',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
    },
  });

  const acmeCustomer = await prisma.customer.create({
    data: {
      userId: acmeUser.id,
      name: 'Alice Johnson',
      email: acmeUser.email,
      companyName: 'Acme Corp',
      billingAddress: '100 Innovation Way, Suite 400, San Francisco, CA',
      phone: '+1 (555) 019-2834',
    },
  });

  // Customer 2: Globex Corporation
  const globexUser = await prisma.user.create({
    data: {
      email: 'globex@example.com',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
    },
  });

  const globexCustomer = await prisma.customer.create({
    data: {
      userId: globexUser.id,
      name: 'Bob Smith',
      email: globexUser.email,
      companyName: 'Globex Corporation',
      billingAddress: '742 Evergreen Terrace, Springfield, OR',
      phone: '+1 (555) 012-9876',
    },
  });
  console.log('[Seed] Created 2 customer profiles: Acme Corp & Globex Corporation');

  // 5. Subscriptions
  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const twentyFiveDaysFromNow = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);

  // Acme: Active subscription on Pro plan
  const acmeSub = await prisma.subscription.create({
    data: {
      customerId: acmeCustomer.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      startDate: fiveDaysAgo,
      currentPeriodStart: fiveDaysAgo,
      currentPeriodEnd: twentyFiveDaysFromNow,
    },
  });

  // Globex: Pending/Active subscription on Starter plan
  const globexSub = await prisma.subscription.create({
    data: {
      customerId: globexCustomer.id,
      planId: starterPlan.id,
      status: 'ACTIVE',
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthFromNow,
    },
  });
  console.log('[Seed] Created active subscriptions');

  // 6. Invoices & Payments
  // Invoice 1: Acme Corp - PAID
  const acmeInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      customerId: acmeCustomer.id,
      subscriptionId: acmeSub.id,
      subtotal: 49.0,
      discountAmount: 0.0,
      taxRate: 10.0,
      taxAmount: 4.9,
      total: 53.9,
      status: 'PAID',
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            description: 'SubscriptIQ Pro Plan - Monthly Subscription',
            unitPrice: 49.0,
            quantity: 1,
            amount: 49.0,
          },
        ],
      },
    },
  });

  // Simulated Payment for Acme Invoice
  await prisma.payment.create({
    data: {
      invoiceId: acmeInvoice.id,
      amount: 53.9,
      paymentMethod: 'SIMULATED',
      transactionRef: 'SIM-TXN-894721',
      paidAt: now,
    },
  });

  // Invoice 2: Globex Corporation - UNPAID / OVERDUE Demo
  const overdueDueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      customerId: globexCustomer.id,
      subscriptionId: globexSub.id,
      subtotal: 19.0,
      discountAmount: 0.0,
      taxRate: 10.0,
      taxAmount: 1.9,
      total: 20.9,
      status: 'OVERDUE',
      dueDate: overdueDueDate,
      items: {
        create: [
          {
            description: 'SubscriptIQ Starter Plan - Monthly Subscription',
            unitPrice: 19.0,
            quantity: 1,
            amount: 19.0,
          },
        ],
      },
    },
  });
  console.log('[Seed] Created 2 invoices (1 PAID with payment record, 1 OVERDUE)');

  console.log('[Seed] Database successfully seeded with deterministic demo data!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
