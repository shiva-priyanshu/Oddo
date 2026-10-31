import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  authenticateToken,
  requireRole,
  requireCustomerOwnership,
} from '../middleware/auth';

export const customersRouter = Router();

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  companyName: z.string().optional(),
  billingAddress: z.string().optional(),
  phone: z.string().optional(),
});

/**
 * GET /api/customers
 * Admin directory of all customers with active subscriptions and invoice counts.
 */
customersRouter.get(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { invoices: true },
        },
      },
    });

    res.status(200).json({ customers });
  }
);

/**
 * GET /api/customers/:id
 * Customer profile view. Enforces customer data isolation.
 */
customersRouter.get(
  '/:id',
  authenticateToken,
  requireCustomerOwnership('id'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: { items: true, payments: true },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found', statusCode: 404 });
      return;
    }

    res.status(200).json({ customer });
  }
);

/**
 * POST /api/customers
 * Admin creates a new customer record.
 */
customersRouter.post(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = createCustomerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid customer data',
        statusCode: 400,
      });
      return;
    }

    const { name, email, companyName, billingAddress, phone } = parseResult.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({
        error: 'A customer with this email already exists',
        statusCode: 409,
      });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email: normalizedEmail,
        companyName: companyName || null,
        billingAddress: billingAddress || null,
        phone: phone || null,
      },
    });

    res.status(201).json({ customer });
  }
);
