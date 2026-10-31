import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authenticateToken, requirePermission } from '../middleware/auth';
import {
  calculateInvoiceFinancials,
  generateNextInvoiceNumber,
  computeLiveInvoiceStatus,
} from '../lib/invoice-calc';

export const invoicesRouter = Router();

const createInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z
    .array(
      z.object({
        description: z.string().min(2, 'Description must be at least 2 characters'),
        unitPrice: z.number().positive('Unit price must be positive'),
        quantity: z.number().int().positive().default(1),
      })
    )
    .min(1, 'Invoice must have at least one line item'),
  discountAmount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(10.0),
});

const recordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z
    .enum(['SIMULATED', 'CREDIT_CARD', 'BANK_TRANSFER', 'CASH'])
    .default('SIMULATED'),
  transactionRef: z.string().optional(),
});

/**
 * GET /api/invoices
 * Lists invoices with status filtering. Restricts customers to their own records.
 * For STAFF, requires manage_invoices, manage_payments, or view_reports.
 */
invoicesRouter.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated', statusCode: 401 });
      return;
    }

    if (req.user.role === 'STAFF') {
      const perms = req.user.permissions || [];
      if (!perms.includes('manage_invoices') && !perms.includes('manage_payments') && !perms.includes('view_reports')) {
        res.status(403).json({ error: 'Access forbidden: missing invoice permissions', statusCode: 403 });
        return;
      }
    }

    const { status, customerId: queryCustomerId } = req.query;

    let targetCustomerId: string | undefined = undefined;
    if (req.user.role === 'CUSTOMER') {
      targetCustomerId = req.user.customerId || 'non-existent-id';
    } else if (typeof queryCustomerId === 'string' && queryCustomerId.length > 0) {
      targetCustomerId = queryCustomerId;
    }

    const where: any = {};
    if (targetCustomerId) {
      where.customerId = targetCustomerId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        payments: {
          orderBy: { paidAt: 'desc' },
        },
        customer: true,
        subscription: {
          include: { plan: true },
        },
      },
    });

    const formattedInvoices = invoices.map((inv) => {
      const paidAmount = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = Math.max(0, Math.round((inv.total - paidAmount) * 100) / 100);
      const liveStatus = computeLiveInvoiceStatus(inv);

      return {
        ...inv,
        paidAmount,
        remainingBalance,
        liveStatus,
      };
    });

    // Apply status filter if provided (and not ALL)
    let result = formattedInvoices;
    if (typeof status === 'string' && status !== 'ALL') {
      result = formattedInvoices.filter((inv) => inv.liveStatus === status || inv.status === status);
    }

    res.status(200).json({ invoices: result });
  }
);

/**
 * GET /api/invoices/:id
 * Retrieve itemized invoice details and payment history.
 */
invoicesRouter.get(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated', statusCode: 401 });
      return;
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: {
          orderBy: { paidAt: 'desc' },
        },
        customer: true,
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found', statusCode: 404 });
      return;
    }

    // Role and ownership check
    if (req.user.role === 'STAFF') {
      const perms = req.user.permissions || [];
      if (!perms.includes('manage_invoices') && !perms.includes('manage_payments') && !perms.includes('view_reports')) {
        res.status(403).json({ error: 'Access forbidden: missing invoice permissions', statusCode: 403 });
        return;
      }
    } else if (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.customerId) {
      res.status(403).json({
        error: 'Access forbidden: cannot view another customer invoice',
        statusCode: 403,
      });
      return;
    }

    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, Math.round((invoice.total - paidAmount) * 100) / 100);
    const liveStatus = computeLiveInvoiceStatus(invoice);

    res.status(200).json({
      invoice: {
        ...invoice,
        paidAmount,
        remainingBalance,
        liveStatus,
      },
    });
  }
);

/**
 * POST /api/invoices
 * Admin or Staff (with manage_invoices) generates an ad-hoc custom invoice.
 */
invoicesRouter.post(
  '/',
  authenticateToken,
  requirePermission('manage_invoices'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = createInvoiceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid invoice data',
        statusCode: 400,
      });
      return;
    }

    const { customerId, dueDate, items, discountAmount, taxRate } = parseResult.data;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found', statusCode: 404 });
      return;
    }

    const financials = calculateInvoiceFinancials(items, discountAmount, taxRate);
    const invoiceNumber = await generateNextInvoiceNumber();

    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          subtotal: financials.subtotal,
          discountAmount: financials.discountAmount,
          taxRate: financials.taxRate,
          taxAmount: financials.taxAmount,
          total: financials.total,
          status: 'UNPAID',
          dueDate: new Date(dueDate),
        },
      });

      for (const item of items) {
        const qty = item.quantity || 1;
        const itemAmount = Math.round(item.unitPrice * qty * 100) / 100;
        await tx.invoiceItem.create({
          data: {
            invoiceId: newInvoice.id,
            description: item.description,
            unitPrice: item.unitPrice,
            quantity: qty,
            amount: itemAmount,
          },
        });
      }

      return tx.invoice.findUnique({
        where: { id: newInvoice.id },
        include: { items: true, customer: true },
      });
    });

    res.status(201).json({ invoice });
  }
);

/**
 * POST /api/invoices/:id/payments
 * Admin or Staff (with manage_payments) records a simulated payment against an invoice.
 */
invoicesRouter.post(
  '/:id/payments',
  authenticateToken,
  requirePermission('manage_payments'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const parseResult = recordPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid payment data',
        statusCode: 400,
      });
      return;
    }

    const { amount, paymentMethod, transactionRef } = parseResult.data;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found', statusCode: 404 });
      return;
    }

    const currentPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.round((invoice.total - currentPaid) * 100) / 100;

    if (remaining <= 0) {
      res.status(400).json({
        error: 'Invoice is already paid in full',
        statusCode: 400,
      });
      return;
    }

    const ref =
      transactionRef && transactionRef.trim().length > 0
        ? transactionRef
        : `SIM-TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const newTotalPaid = Math.round((currentPaid + amount) * 100) / 100;
    const isNowPaidInFull = newTotalPaid >= invoice.total - 0.001;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: id,
          amount,
          paymentMethod,
          transactionRef: ref,
          paidAt: new Date(),
        },
      });

      if (isNowPaidInFull && invoice.status !== 'PAID') {
        await tx.invoice.update({
          where: { id },
          data: { status: 'PAID' },
        });
      }

      return payment;
    });

    const newRemaining = Math.max(0, Math.round((invoice.total - newTotalPaid) * 100) / 100);

    res.status(201).json({
      payment: result,
      invoiceStatus: isNowPaidInFull ? 'PAID' : invoice.status,
      paidAmount: newTotalPaid,
      remainingBalance: newRemaining,
      isPaidInFull: isNowPaidInFull,
    });
  }
);
