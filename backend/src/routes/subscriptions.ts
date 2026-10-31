import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { calculateNextRenewalDate, computeSubscriptionStatus } from '../lib/billing-dates';
import { calculateInvoiceFinancials, generateNextInvoiceNumber } from '../lib/invoice-calc';

export const subscriptionsRouter = Router();

const createSubscriptionSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  startDate: z.string().datetime().optional().or(z.string().optional()),
});

const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
});

/**
 * GET /api/subscriptions
 * Admin view: all subscriptions. Customer view: their own subscriptions only.
 */
subscriptionsRouter.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated', statusCode: 401 });
      return;
    }

    const where =
      req.user.role === 'ADMIN'
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
 * Admin assigns a plan to a customer, calculating period dates.
 */
subscriptionsRouter.post(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
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
 * Protected by ownership for customers, global for admins.
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

    // Ownership check: Customers can only cancel their own subscription
    if (req.user.role === 'CUSTOMER' && sub.customerId !== req.user.customerId) {
      res.status(403).json({
        error: 'Access forbidden: cannot modify another customer subscription',
        statusCode: 403,
      });
      return;
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
