import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as env from '../env/index';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    role?: string;
  };
}

interface TokenPayload {
  userId: string;
  email?: string;
  role?: string;
  tokenVersion?: number;
}

// Extract JWT token from cookies
function getTokenFromCookies(req: Request): string | null {
  const token = req.cookies['auth-token'];
  return token || null;
}

// Extract JWT token from Authorization header
function getTokenFromHeader(req: Request): string | null {
  const authHeader = req.header('authorization') || req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring('Bearer '.length);
}

/**
 * JWT Authentication Middleware
 * Checks for JWT token in cookies (primary) or Authorization header (fallback)
 */
export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to get token from cookies first, then from header
    const token = getTokenFromCookies(req) || getTokenFromHeader(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    if (!env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      res.status(500).json({
        success: false,
        error: 'Authentication service unavailable'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'learning-management-system',
      audience: 'lms-users',
      algorithms: ['HS256']
    }) as TokenPayload;

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else {
      console.error('JWT authentication error:', error);
      res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }
}

/**
 * Optional JWT Authentication Middleware
 * Attaches user info if token is present, but doesn't require it
 */
export async function optionalAuthenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getTokenFromCookies(req) || getTokenFromHeader(req);

    if (!token || !env.JWT_SECRET) {
      next();
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'learning-management-system',
      audience: 'lms-users',
      algorithms: ['HS256']
    }) as TokenPayload;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    // Don't fail on optional auth, just continue without user
    next();
  }
}

/**
 * Role-based authorization middleware
 * Must be used after authenticateJWT
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
}
