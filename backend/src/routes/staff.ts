import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

export const staffRouter = Router();

const validPermissions = [
  'manage_customers',
  'manage_plans',
  'manage_subscriptions',
  'manage_invoices',
  'manage_payments',
  'view_reports',
] as const;

const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  permissions: z.array(z.string()).default([]),
});

const updateStaffSchema = z.object({
  name: z.string().min(2).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

/**
 * GET /api/staff
 * Lists all staff members. Only ADMIN can access.
 */
staffRouter.get(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    const staffMembers = await prisma.user.findMany({
      where: { role: 'STAFF' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const formattedStaff = staffMembers.map((s) => {
      let perms: string[] = [];
      try {
        perms = JSON.parse(s.permissions);
      } catch {
        perms = [];
      }
      return {
        ...s,
        permissionsList: perms,
      };
    });

    res.status(200).json({ staff: formattedStaff });
  }
);

/**
 * POST /api/staff
 * Create a new staff account with explicit permissions. Only ADMIN can access.
 */
staffRouter.post(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = createStaffSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid staff payload',
        statusCode: 400,
      });
      return;
    }

    const { name, email, password, permissions } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({
        error: 'A user account with this email already exists',
        statusCode: 409,
      });
      return;
    }

    // Filter to known permissions
    const sanitizedPermissions = permissions.filter((p) =>
      validPermissions.includes(p as any)
    );

    const passwordHash = await bcrypt.hash(password, 10);

    const newStaff = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
        role: 'STAFF', // Strictly enforces STAFF role (cannot create ADMIN here)
        isActive: true,
        permissions: JSON.stringify(sanitizedPermissions),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({
      staff: {
        ...newStaff,
        permissionsList: sanitizedPermissions,
      },
    });
  }
);

/**
 * PATCH /api/staff/:id
 * Activate/deactivate staff account, update name, permissions, or password. Only ADMIN can access.
 */
staffRouter.patch(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const parseResult = updateStaffSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid update payload',
        statusCode: 400,
      });
      return;
    }

    // Target must exist and must be a STAFF member
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'STAFF') {
      res.status(404).json({
        error: 'Staff member not found',
        statusCode: 404,
      });
      return;
    }

    const updateData: any = {};
    if (parseResult.data.name !== undefined) {
      updateData.name = parseResult.data.name;
    }
    if (parseResult.data.isActive !== undefined) {
      updateData.isActive = parseResult.data.isActive;
    }
    if (parseResult.data.permissions !== undefined) {
      const sanitized = parseResult.data.permissions.filter((p) =>
        validPermissions.includes(p as any)
      );
      updateData.permissions = JSON.stringify(sanitized);
    }
    if (parseResult.data.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(parseResult.data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let perms: string[] = [];
    try {
      perms = JSON.parse(updated.permissions);
    } catch {
      perms = [];
    }

    res.status(200).json({
      staff: {
        ...updated,
        permissionsList: perms,
      },
    });
  }
);
