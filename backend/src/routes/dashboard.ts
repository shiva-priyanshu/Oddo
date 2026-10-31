import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { computeLiveInvoiceStatus } from '../lib/invoice-calc';

export const dashboardRouter = Router();

/**
 * GET /api/dashboard/stats
 * Admin executive analytics endpoint aggregating MRR, ARR, renewals, plan tiers, and activity.
 */
dashboardRouter.get(
  '/stats',
  authenticateToken,
  requireRole('ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Total counts
    const totalCustomers = await prisma.customer.count();
    const totalPlans = await prisma.plan.count();
    const activePlansCount = await prisma.plan.count({ where: { isActive: true } });

    // 2. Active Subscriptions & MRR / ARR calculation
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: {
        plan: true,
        customer: true,
      },
      orderBy: { currentPeriodEnd: 'asc' },
    });

    let rawMrr = 0;
    const planCounts: Record<string, { planId: string; name: string; interval: string; price: number; subscribers: number; revenue: number }> = {};

    for (const sub of activeSubscriptions) {
      const plan = sub.plan;
      let monthlyContribution = 0;
      if (plan.billingInterval === 'MONTHLY') {
        monthlyContribution = plan.price;
      } else if (plan.billingInterval === 'YEARLY') {
        monthlyContribution = plan.price / 12;
      }
      rawMrr += monthlyContribution;

      if (!planCounts[plan.id]) {
        planCounts[plan.id] = {
          planId: plan.id,
          name: plan.name,
          interval: plan.billingInterval,
          price: plan.price,
          subscribers: 0,
          revenue: 0,
        };
      }
      planCounts[plan.id].subscribers += 1;
      planCounts[plan.id].revenue = Math.round((planCounts[plan.id].revenue + monthlyContribution) * 100) / 100;
    }

    const mrr = Math.round(rawMrr * 100) / 100;
    const arr = Math.round(mrr * 12 * 100) / 100;

    // 3. Upcoming Renewals (Within 7 and 30 days)
    const upcomingRenewals = activeSubscriptions
      .filter((sub) => {
        const endTime = new Date(sub.currentPeriodEnd).getTime();
        return endTime >= now.getTime() && endTime <= thirtyDaysFromNow.getTime();
      })
      .map((sub) => {
        const endTime = new Date(sub.currentPeriodEnd).getTime();
        const daysUntil = Math.max(0, Math.ceil((endTime - now.getTime()) / (24 * 60 * 60 * 1000)));
        return {
          subscriptionId: sub.id,
          customerId: sub.customerId,
          customerName: sub.customer.name,
          companyName: sub.customer.companyName || sub.customer.name,
          email: sub.customer.email,
          planName: sub.plan.name,
          billingInterval: sub.plan.billingInterval,
          renewalPrice: sub.plan.price,
          renewalDate: sub.currentPeriodEnd,
          daysUntilRenewal: daysUntil,
          isUrgent7Day: daysUntil <= 7,
        };
      });

    // 4. Invoices & Revenue Metrics
    const invoices = await prisma.invoice.findMany({
      include: { payments: true, customer: true },
    });

    let unpaidCount = 0;
    let unpaidAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let paidCount = 0;
    let paidTotalAmount = 0;

    for (const inv of invoices) {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, Math.round((inv.total - paid) * 100) / 100);
      const liveStatus = computeLiveInvoiceStatus(inv);

      if (liveStatus === 'PAID') {
        paidCount++;
        paidTotalAmount += inv.total;
      } else if (liveStatus === 'OVERDUE') {
        overdueCount++;
        overdueAmount += remaining;
      } else {
        unpaidCount++;
        unpaidAmount += remaining;
      }
    }

    // Total actual collected cash across all payment records
    const allPayments = await prisma.payment.findMany();
    const totalCollectedRevenue = Math.round(allPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;

    // 5. Recent Activity Event Feed
    const recentPayments = await prisma.payment.findMany({
      take: 6,
      orderBy: { paidAt: 'desc' },
      include: {
        invoice: {
          include: { customer: true },
        },
      },
    });

    const recentSubs = await prisma.subscription.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, plan: true },
    });

    const activityFeed: Array<{
      id: string;
      type: 'PAYMENT' | 'SUBSCRIPTION';
      title: string;
      description: string;
      timestamp: Date;
      amount?: number;
      customerName: string;
    }> = [];

    for (const p of recentPayments) {
      const custName = p.invoice?.customer?.companyName || p.invoice?.customer?.name || 'Customer';
      activityFeed.push({
        id: `act-pay-${p.id}`,
        type: 'PAYMENT',
        title: 'Payment Received',
        description: `$${p.amount.toFixed(2)} settled for invoice ${p.invoice?.invoiceNumber || ''} via ${p.paymentMethod}`,
        timestamp: p.paidAt,
        amount: p.amount,
        customerName: custName,
      });
    }

    for (const s of recentSubs) {
      const custName = s.customer?.companyName || s.customer?.name || 'Customer';
      activityFeed.push({
        id: `act-sub-${s.id}`,
        type: 'SUBSCRIPTION',
        title: 'Subscription Activated',
        description: `${custName} subscribed to ${s.plan?.name || 'Plan'} (${s.plan?.billingInterval || 'MONTHLY'})`,
        timestamp: s.createdAt,
        amount: s.plan?.price,
        customerName: custName,
      });
    }

    activityFeed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const limitedActivityFeed = activityFeed.slice(0, 10);

    res.status(200).json({
      metrics: {
        totalCustomers,
        totalPlans,
        activePlansCount,
        activeSubscriptionsCount: activeSubscriptions.length,
        mrr,
        arr,
        totalCollectedRevenue,
        invoices: {
          unpaidCount,
          unpaidAmount: Math.round(unpaidAmount * 100) / 100,
          overdueCount,
          overdueAmount: Math.round(overdueAmount * 100) / 100,
          paidCount,
          paidTotalAmount: Math.round(paidTotalAmount * 100) / 100,
        },
      },
      planDistribution: Object.values(planCounts),
      upcomingRenewals,
      activityFeed: limitedActivityFeed,
    });
  }
);

/**
 * GET /api/dashboard/customer-summary
 * Customer self-service portal endpoint scoped to the authenticated customer.
 */
dashboardRouter.get(
  '/customer-summary',
  authenticateToken,
  requireRole('CUSTOMER'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.customerId) {
      res.status(403).json({ error: 'Customer profile required', statusCode: 403 });
      return;
    }

    const customerId = req.user.customerId;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true, items: true },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer record not found', statusCode: 404 });
      return;
    }

    // Active subscription (first active if any)
    const activeSub = customer.subscriptions.find((s) => s.status === 'ACTIVE') || customer.subscriptions[0] || null;

    let daysUntilRenewal: number | null = null;
    if (activeSub) {
      const now = Date.now();
      const end = new Date(activeSub.currentPeriodEnd).getTime();
      daysUntilRenewal = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
    }

    // Financial totals
    let totalInvoiced = 0;
    let totalPaid = 0;
    let balanceDue = 0;

    const formattedInvoices = customer.invoices.map((inv) => {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, Math.round((inv.total - paid) * 100) / 100);
      const liveStatus = computeLiveInvoiceStatus(inv);

      totalInvoiced += inv.total;
      totalPaid += paid;
      balanceDue += remaining;

      return {
        ...inv,
        paidAmount: paid,
        remainingBalance: remaining,
        liveStatus,
      };
    });

    res.status(200).json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        companyName: customer.companyName,
        billingAddress: customer.billingAddress,
        phone: customer.phone,
      },
      activeSubscription: activeSub
        ? {
            id: activeSub.id,
            status: activeSub.status,
            startDate: activeSub.startDate,
            currentPeriodStart: activeSub.currentPeriodStart,
            currentPeriodEnd: activeSub.currentPeriodEnd,
            daysUntilRenewal,
            plan: activeSub.plan,
          }
        : null,
      financials: {
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        balanceDue: Math.round(balanceDue * 100) / 100,
      },
      recentInvoices: formattedInvoices.slice(0, 5),
    });
  }
);
