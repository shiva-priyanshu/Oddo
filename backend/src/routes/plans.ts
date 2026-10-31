import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { verifyToken } from '../lib/jwt';

export const plansRouter = Router();

const planSchema = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  price: z.number().positive('Price must be greater than 0'),
  currency: z.string().default('USD'),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']),
  features: z.union([z.array(z.string()), z.string()]).transform((val) => {
    if (Array.isArray(val)) return JSON.stringify(val);
    try {
      JSON.parse(val);
      return val;
    } catch {
      return JSON.stringify([val]);
    }
  }),
});

/**
 * GET /api/plans
 * Returns all active plans for public/customers, or all plans for authenticated Admins.
 */
plansRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  // Check optional auth header for admin role
  let isAdmin = false;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (payload.role === 'ADMIN') isAdmin = true;
    } catch {
      // Ignored for public listing
    }
  }

  const where = isAdmin ? {} : { isActive: true };
  const plans = await prisma.plan.findMany({
    where,
    orderBy: { price: 'asc' },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });

  const formattedPlans = plans.map((p) => {
    let parsedFeatures: string[] = [];
    try {
      parsedFeatures = JSON.parse(p.features);
    } catch {
      parsedFeatures = [p.features];
    }
    return {
      ...p,
      featuresList: parsedFeatures,
      subscriptionCount: p._count.subscriptions,
    };
  });

  res.status(200).json({ plans: formattedPlans });
});

/**
 * POST /api/plans
 * Admin creates a new plan tier.
 */
plansRouter.post(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = planSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid plan data',
        statusCode: 400,
      });
      return;
    }

    const { name, description, price, currency, billingInterval, features } = parseResult.data;

    const plan = await prisma.plan.create({
      data: {
        name,
        description,
        price,
        currency,
        billingInterval,
        features,
        isActive: true,
      },
    });

    res.status(201).json({ plan });
  }
);

/**
 * PUT /api/plans/:id
 * Admin updates existing plan metadata.
 */
plansRouter.put(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Plan not found', statusCode: 404 });
      return;
    }

    const parseResult = planSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid plan data',
        statusCode: 400,
      });
      return;
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: parseResult.data,
    });

    res.status(200).json({ plan: updated });
  }
);

/**
 * PATCH /api/plans/:id/toggle
 * Admin toggles plan active/inactive status.
 */
plansRouter.patch(
  '/:id/toggle',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Plan not found', statusCode: 404 });
      return;
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    res.status(200).json({
      plan: updated,
      message: `Plan is now ${updated.isActive ? 'active' : 'inactive'}`,
    });
  }
);
