import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { calculateNextRenewalDate, computeSubscriptionStatus } from '../lib/billing-dates';
import { calculateInvoiceFinancials, generateNextInvoiceNumber } from '../lib/invoice-calc';

export const subscriptionsRouter = Router();

const createSubscriptionSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  startDate: z.string().datetime().optional().or(z.string().optional()),
});

const checkoutSubscriptionSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  customerId: z.string().optional(),
  paymentMethod: z
    .enum(['SIMULATED_CARD', 'SIMULATED_BANK', 'SIMULATED_WALLET', 'SIMULATED', 'CREDIT_CARD', 'BANK_TRANSFER'])
    .default('SIMULATED_CARD'),
  simulateFailure: z.boolean().optional().default(false),
});

const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
});

/**
 * POST /api/subscriptions/checkout
 * Customer or Admin/Staff self-service subscription checkout with immediate simulated payment settlement.
 * Enforces customer authentication, tenant ownership, active plan validation, and duplicate prevention.
 */
subscriptionsRouter.post(
  '/checkout',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated', statusCode: 401 });
      return;
    }

    const parseResult = checkoutSubscriptionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid checkout payload',
        statusCode: 400,
      });
      return;
    }

    const { planId, customerId: requestedCustomerId, paymentMethod, simulateFailure } = parseResult.data;

    // Resolve & authorize target customer ID
    let targetCustomerId = req.user.customerId;
    if (req.user.role === 'CUSTOMER') {
      if (!targetCustomerId) {
        // Find or auto-provision customer record for authenticated user
        let customer = await prisma.customer.findFirst({
          where: {
            OR: [{ userId: req.user.userId }, { email: req.user.email }],
          },
        });
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              userId: req.user.userId,
              email: req.user.email,
              name: req.user.name || req.user.email.split('@')[0],
            },
          });
        }
        targetCustomerId = customer.id;
      }

      // Strict ownership check: customer cannot purchase on behalf of another customer
      if (requestedCustomerId && requestedCustomerId !== targetCustomerId) {
        res.status(403).json({
          error: 'Access forbidden: cannot purchase a subscription on behalf of another customer',
          statusCode: 403,
        });
        return;
      }
    } else {
      // ADMIN or STAFF role
      targetCustomerId = requestedCustomerId || targetCustomerId;
      if (!targetCustomerId) {
        res.status(400).json({
          error: 'Customer ID is required for administrative checkout',
          statusCode: 400,
        });
        return;
      }
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: targetCustomerId } });
    if (!customer) {
      res.status(404).json({ error: 'Customer record not found', statusCode: 404 });
      return;
    }

    // Verify plan exists and is ACTIVE
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      res.status(404).json({ error: 'Plan not found', statusCode: 404 });
      return;
    }

    if (!plan.isActive) {
      res.status(400).json({
        error: 'Cannot subscribe to an inactive plan',
        statusCode: 400,
      });
      return;
    }

    // Duplicate subscription prevention: prevent duplicate ACTIVE subscriptions to the same plan
    const existingActiveSub = await prisma.subscription.findFirst({
      where: {
        customerId: targetCustomerId,
        planId,
        status: 'ACTIVE',
      },
    });

    if (existingActiveSub) {
      res.status(409).json({
        error: `Customer is already actively subscribed to the ${plan.name} plan`,
        statusCode: 409,
        subscriptionId: existingActiveSub.id,
      });
      return;
    }

    // Simulated failure injection for hackathon demonstration
    if (simulateFailure) {
      res.status(402).json({
        error: 'Simulated payment failed: Card declined or insufficient demo funds',
        statusCode: 402,
        code: 'SIMULATED_PAYMENT_FAILED',
      });
      return;
    }

    const start = new Date();
    const periodEnd = calculateNextRenewalDate(
      start,
      plan.billingInterval as 'MONTHLY' | 'YEARLY'
    );
    const invoiceNumber = await generateNextInvoiceNumber();
    const financials = calculateInvoiceFinancials([{ unitPrice: plan.price, quantity: 1 }], 0, 10.0);
    const txnRef = `SIM-CHK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Atomically create subscription, invoice, line item, and payment record
    const result = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          customerId: targetCustomerId,
          planId,
          status: 'ACTIVE',
          startDate: start,
          currentPeriodStart: start,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        include: {
          plan: true,
          customer: true,
        },
      });

      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: targetCustomerId,
          subscriptionId: sub.id,
          subtotal: financials.subtotal,
          discountAmount: financials.discountAmount,
          taxRate: financials.taxRate,
          taxAmount: financials.taxAmount,
          total: financials.total,
          status: 'PAID',
          dueDate: start,
        },
      });

      await tx.invoiceItem.create({
        data: {
          invoiceId: inv.id,
          description: `${plan.name} Plan - ${plan.billingInterval} Subscription`,
          unitPrice: plan.price,
          quantity: 1,
          amount: plan.price,
        },
      });

      const payment = await tx.payment.create({
        data: {
          invoiceId: inv.id,
          amount: financials.total,
          paymentMethod: 'SIMULATED',
          transactionRef: txnRef,
          paidAt: start,
        },
      });

      return { subscription: sub, invoice: inv, payment };
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created and simulated payment completed successfully',
      subscription: result.subscription,
      invoice: result.invoice,
      payment: result.payment,
      paidAmount: financials.total,
      remainingBalance: 0,
      paymentMethod,
    });
  }
);

/**
 * GET /api/subscriptions
 * Admin view: all subscriptions.
 * Staff view: all subscriptions (if granted manage_subscriptions).
 * Customer view: their own subscriptions only.
 */
subscriptionsRouter.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated', statusCode: 401 });
      return;
    }

    if (req.user.role === 'STAFF') {
      const perms = req.user.permissions || [];
      if (!perms.includes('manage_subscriptions')) {
        res.status(403).json({
          error: 'Access forbidden: missing manage_subscriptions permission',
          statusCode: 403,
        });
        return;
      }
    }

    const where =
      req.user.role === 'ADMIN' ||
      (req.user.role === 'STAFF' && req.user.permissions?.includes('manage_subscriptions'))
        ? {}
        : { customerId: req.user.customerId || 'non-existent-id' };

    const subs = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        customer: true,
      },
    });

    // Dynamically compute live status (e.g. check if past periodEnd)
    const formatted = subs.map((sub) => ({
      ...sub,
      liveStatus: computeSubscriptionStatus(sub),
    }));

    res.status(200).json({ subscriptions: formatted });
  }
);

/**
 * POST /api/subscriptions
 * Admin or Staff (with manage_subscriptions) assigns a plan to a customer, calculating period dates.
 */
subscriptionsRouter.post(
  '/',
  authenticateToken,
  requirePermission('manage_subscriptions'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = createSubscriptionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid subscription data',
        statusCode: 400,
      });
      return;
    }

    const { customerId, planId, startDate: rawStartDate } = parseResult.data;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found', statusCode: 404 });
      return;
    }

    // Verify plan exists and is ACTIVE
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      res.status(404).json({ error: 'Plan not found', statusCode: 404 });
      return;
    }

    if (!plan.isActive) {
      res.status(400).json({
        error: 'Cannot subscribe to an inactive plan',
        statusCode: 400,
      });
      return;
    }

    const start = rawStartDate ? new Date(rawStartDate) : new Date();
    const periodEnd = calculateNextRenewalDate(
      start,
      plan.billingInterval as 'MONTHLY' | 'YEARLY'
    );

    const dueDate = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    const invoiceNumber = await generateNextInvoiceNumber();
    const financials = calculateInvoiceFinancials([{ unitPrice: plan.price, quantity: 1 }], 0, 10.0);

    const { subscription, invoice } = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          customerId,
          planId,
          status: 'ACTIVE',
          startDate: start,
          currentPeriodStart: start,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        include: {
          plan: true,
          customer: true,
        },
      });

      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          subscriptionId: sub.id,
          subtotal: financials.subtotal,
          discountAmount: financials.discountAmount,
          taxRate: financials.taxRate,
          taxAmount: financials.taxAmount,
          total: financials.total,
          status: 'UNPAID',
          dueDate,
        },
      });

      await tx.invoiceItem.create({
        data: {
          invoiceId: inv.id,
          description: `${plan.name} Plan - ${plan.billingInterval} Subscription`,
          unitPrice: plan.price,
          quantity: 1,
          amount: plan.price,
        },
      });

      return { subscription: sub, invoice: inv };
    });

    res.status(201).json({ subscription, invoice });
  }
);

/**
 * PATCH /api/subscriptions/:id/cancel
 * Cancel a subscription immediately or schedule cancellation at period end.
 * Protected by ownership for customers, manage_subscriptions for staff, global for admins.
 */
subscriptionsRouter.patch(
  '/:id/cancel',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated', statusCode: 401 });
      return;
    }

    const { id } = req.params;

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!sub) {
      res.status(404).json({ error: 'Subscription not found', statusCode: 404 });
      return;
    }

    // Role & permission validation
    if (req.user.role === 'STAFF') {
      const perms = req.user.permissions || [];
      if (!perms.includes('manage_subscriptions')) {
        res.status(403).json({
          error: 'Access forbidden: missing manage_subscriptions permission',
          statusCode: 403,
        });
        return;
      }
    } else if (req.user.role === 'CUSTOMER') {
      // Ownership check: Customers can only cancel their own subscription
      if (sub.customerId !== req.user.customerId) {
        res.status(403).json({
          error: 'Access forbidden: cannot modify another customer subscription',
          statusCode: 403,
        });
        return;
      }
    }

    const parseResult = cancelSubscriptionSchema.safeParse(req.body);
    const immediate = parseResult.success ? parseResult.data.immediate : false;

    let updated;
    if (immediate) {
      updated = await prisma.subscription.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelAtPeriodEnd: false,
        },
        include: { plan: true },
      });
    } else {
      updated = await prisma.subscription.update({
        where: { id },
        data: {
          cancelAtPeriodEnd: true,
        },
        include: { plan: true },
      });
    }

    res.status(200).json({
      subscription: updated,
      message: immediate
        ? 'Subscription cancelled immediately'
        : 'Subscription scheduled for cancellation at period end',
    });
  }
);
