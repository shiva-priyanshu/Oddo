import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import {
  authenticateToken,
  requireRole,
  requireCustomerOwnership,
} from '../middleware/auth';

export const authRouter = Router();

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().optional(),
  billingAddress: z.string().optional(),
  phone: z.string().optional(),
});

/**
 * POST /api/auth/login
 * Validates credentials and returns a JWT plus safe user profile.
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.errors[0]?.message || 'Invalid request body',
      statusCode: 400,
    });
    return;
  }

  const { email, password } = parseResult.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { customer: true },
  });

  if (!user) {
    res.status(401).json({
      error: 'Invalid email or password',
      statusCode: 401,
    });
    return;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    res.status(401).json({
      error: 'Invalid email or password',
      statusCode: 401,
    });
    return;
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role as 'ADMIN' | 'CUSTOMER',
    customerId: user.customer?.id,
  });

  // Never return passwordHash
  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.customer?.name || (user.role === 'ADMIN' ? 'Administrator' : 'Customer'),
      companyName: user.customer?.companyName || null,
      customerId: user.customer?.id || null,
    },
  });
});

/**
 * POST /api/auth/register-customer
 * Public customer self-registration. Strictly forces role: 'CUSTOMER'.
 */
authRouter.post('/register-customer', async (req: Request, res: Response): Promise<void> => {
  const parseResult = registerCustomerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.errors[0]?.message || 'Invalid registration data',
      statusCode: 400,
    });
    return;
  }

  const { name, email, password, companyName, billingAddress, phone } = parseResult.data;
  const normalizedEmail = email.toLowerCase();

  // Check if email is already taken
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    res.status(409).json({
      error: 'An account with this email already exists',
      statusCode: 409,
    });
    return;
  }

  // Hash password with 10 salt rounds
  const passwordHash = await bcrypt.hash(password, 10);

  // Transactionally create User and Customer records with STRICTLY hardcoded CUSTOMER role
  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: 'CUSTOMER', // Strict privilege escalation guard
      },
    });

    const newCustomer = await tx.customer.create({
      data: {
        userId: newUser.id,
        name,
        email: normalizedEmail,
        companyName: companyName || null,
        billingAddress: billingAddress || null,
        phone: phone || null,
      },
    });

    return { user: newUser, customer: newCustomer };
  });

  const token = signToken({
    userId: result.user.id,
    email: result.user.email,
    role: 'CUSTOMER',
    customerId: result.customer.id,
  });

  res.status(201).json({
    token,
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.customer.name,
      companyName: result.customer.companyName,
      customerId: result.customer.id,
    },
  });
});

/**
 * GET /api/auth/me
 * Returns authenticated user context and linked customer profile.
 */
authRouter.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated', statusCode: 401 });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: {
      customer: {
        include: {
          subscriptions: {
            include: { plan: true },
          },
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found', statusCode: 404 });
    return;
  }

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.customer?.name || (user.role === 'ADMIN' ? 'Administrator' : 'Customer'),
      companyName: user.customer?.companyName || null,
      customerId: user.customer?.id || null,
      customer: user.customer || null,
    },
  });
});

/**
 * GET /api/auth/admin-only
 * Security test endpoint enforcing requireRole('ADMIN').
 */
authRouter.get(
  '/admin-only',
  authenticateToken,
  requireRole('ADMIN'),
  (_req: Request, res: Response) => {
    res.status(200).json({ message: 'Welcome Admin', authorized: true });
  }
);

/**
 * GET /api/auth/customer-data/:customerId
 * Security test endpoint enforcing customer data isolation.
 */
authRouter.get(
  '/customer-data/:customerId',
  authenticateToken,
  requireCustomerOwnership('customerId'),
  (req: Request, res: Response) => {
    res.status(200).json({
      message: `Access granted to customer data: ${req.params.customerId}`,
      customerId: req.params.customerId,
      authorized: true,
    });
  }
);
