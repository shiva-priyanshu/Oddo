import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../lib/jwt';

// Extend Express Request to hold the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware: Verify Bearer JWT token from Authorization header.
 * Returns 401 on missing, expired, or invalid tokens.
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    res.status(401).json({
      error: 'Authentication token required',
      statusCode: 401,
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      error: 'Malformed authorization header. Expected: Bearer <token>',
      statusCode: 401,
    });
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    const errorMessage =
      err.message === 'TOKEN_EXPIRED'
        ? 'Authentication token expired'
        : 'Invalid authentication token';

    res.status(401).json({
      error: errorMessage,
      statusCode: 401,
    });
    return;
  }
}

/**
 * Middleware: Require one of the specified roles (e.g. 'ADMIN').
 * Returns 403 if authenticated user does not have required role.
 */
export function requireRole(...allowedRoles: Array<'ADMIN' | 'CUSTOMER'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        statusCode: 401,
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access forbidden: insufficient permissions',
        statusCode: 403,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware: Enforce customer data isolation.
 * Admins can access any customer's data.
 * Customers can ONLY access their own customerId.
 */
export function requireCustomerOwnership(paramName: string = 'customerId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        statusCode: 401,
      });
      return;
    }

    // Admins have global visibility
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // Customer check: verify target customerId matches the logged-in customer's ID
    const targetCustomerId = req.params[paramName] || req.query[paramName] || req.body[paramName];
    if (!req.user.customerId || req.user.customerId !== targetCustomerId) {
      res.status(403).json({
        error: 'Access forbidden: cannot access another customer data',
        statusCode: 403,
      });
      return;
    }

    next();
  };
}
