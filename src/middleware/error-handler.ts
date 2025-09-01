import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import * as env from '../env'

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean
  public code?: string

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.code = code

    Error.captureStackTrace(this, this.constructor)
  }
}

export const globalErrorHandler = (
  error: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = 'Internal Server Error'
  let details: any = undefined

  // Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400
    message = 'Validation Error'
    details = error.issues.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
  // Custom app errors
  else if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
  }
  // JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }
  // Prisma errors
  else if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any
    if (prismaError.code === 'P2002') {
      statusCode = 409
      message = 'Resource already exists'
      details = { field: prismaError.meta?.target }
    } else if (prismaError.code === 'P2025') {
      statusCode = 404
      message = 'Resource not found'
    }
  }

  // Log error (but don't expose sensitive info in production)
  const errorLog = {
    requestId: (req as any).id,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode,
    message: error.message,
    stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    userId: (req as any).userId || 'anonymous'
  }

  console.error('🚨 ERROR:', JSON.stringify(errorLog, null, 2))

  // Send error response
  const response: any = {
    success: false,
    message,
    requestId: (req as any).id,
    timestamp: new Date().toISOString()
  }

  if (details) {
    response.details = details
  }

  // Include stack trace in development
  if (env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack
  }

  res.status(statusCode).json(response)
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
