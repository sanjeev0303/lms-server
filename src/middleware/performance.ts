import { Request, Response, NextFunction } from 'express';
import { performanceLogger } from '@/config/logger';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  userAgent?: string;
  ip?: string;
}

declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      metrics?: PerformanceMetrics;
    }
  }
}

/**
 * Performance monitoring middleware
 * Tracks request duration, memory usage, and response metrics
 */
export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Store metrics on request object
  req.startTime = startTime;
  req.metrics = {
    requestId: req.headers['x-request-id'] as string || 'unknown',
    method: req.method,
    url: req.originalUrl,
    startTime,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const endMemory = process.memoryUsage();

    // Calculate memory delta
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
    };

    // Get response size if available
    const responseSize = chunk ? Buffer.byteLength(chunk) : 0;

    const metrics: PerformanceMetrics = {
      ...req.metrics!,
      endTime,
      duration,
      statusCode: res.statusCode,
      responseSize,
      memoryUsage: memoryDelta
    };

    // Log performance metrics
    if (duration > 1000) { // Log slow requests (>1s)
      performanceLogger.warn('Slow request detected', metrics);
    } else if (duration > 500) { // Log medium requests (>500ms)
      performanceLogger.info('Medium duration request', metrics);
    } else {
      // Only log in debug mode for fast requests
      performanceLogger.debug('Request completed', metrics);
    }

    // Log memory concerns
    if (memoryDelta.heapUsed > 50 * 1024 * 1024) { // 50MB
      performanceLogger.warn('High memory usage detected', {
        requestId: metrics.requestId,
        memoryDelta,
        endpoint: `${req.method} ${req.originalUrl}`
      });
    }

    // Call original end function
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Request timeout middleware
 * Automatically timeout requests that take too long
 */
export const requestTimeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        performanceLogger.error('Request timeout', {
          requestId: req.headers['x-request-id'],
          method: req.method,
          url: req.originalUrl,
          timeout: timeoutMs,
          ip: req.ip
        });

        res.status(408).json({
          success: false,
          message: 'Request timeout',
          code: 'REQUEST_TIMEOUT'
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): Response {
      clearTimeout(timeout);
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

/**
 * Memory usage monitoring middleware
 * Triggers warnings when memory usage is high
 */
export const memoryMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const memoryUsage = process.memoryUsage();
  const memoryThreshold = 500 * 1024 * 1024; // 500MB

  if (memoryUsage.heapUsed > memoryThreshold) {
    performanceLogger.warn('High memory usage detected', {
      memoryUsage,
      requestId: req.headers['x-request-id'],
      endpoint: `${req.method} ${req.originalUrl}`,
      pid: process.pid
    });
  }

  next();
};
