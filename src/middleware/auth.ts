import { verifyToken } from '@clerk/backend'
import { NextFunction, Request, Response } from 'express'

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    email?: string
    firstName?: string
    lastName?: string
    imageUrl?: string
  }
}

// PERFORMANCE: Optimized token extraction with early returns
function getBearerToken(req: Request): string | null {
  const authHeader = req.header('authorization') || req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.substring('Bearer '.length)
}

// Main authentication middleware
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // PERFORMANCE: Early validation before expensive operations
    const token = getBearerToken(req)
    if (!token) {
      res.status(401).json({ error: 'Missing Bearer token' })
      return
    }

    const secret = process.env.CLERK_SECRET_KEY
    if (!secret) {
      // SECURITY: Server configuration error should be logged
      console.error('CLERK_SECRET_KEY not configured')
      res.status(500).json({ error: 'Authentication service unavailable' })
      return
    }

    // CLEAN ARCHITECTURE: Delegate token verification to external service
    const verified = await verifyToken(token, { secretKey: secret })
    req.user = {
      userId: verified.sub as string,
      email: verified.email as string | undefined,
      firstName: verified.first_name as string | undefined,
      lastName: verified.last_name as string | undefined,
      imageUrl: verified.image_url as string | undefined
    }
    next()
  } catch (error) {
    // ERROR HANDLING: Consistent error response format
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
