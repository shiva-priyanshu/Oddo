import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Database connectivity probe
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error: any) {
    console.error('[HealthCheck] Database probe failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error?.message || 'Database unavailable',
    });
  }
});
