import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { NODE_ENV, PORT } from '@/env';
import { logger, performanceLogger, securityLogger } from '@/config/logger';

// Import routes
import AuthRouter from '@/routes/auth-router';
import CourseRouter from '@/routes/course-router';
import LectureRouter from '@/routes/lecture-router';
import OrderRouter from '@/routes/order-router';
import LectureProgressRouter from '@/routes/lecture-progress-router';

// Import middleware
import { requestIdMiddleware, requestLogger } from '@/middleware/request-id';
import { globalErrorHandler } from '@/middleware/error-handler';
import { performanceMiddleware } from './middleware/performance';
import { securityMiddleware } from './middleware/security';

/**
 * Production-optimized Express application factory
 * Implements security, performance, and monitoring best practices
 */
export const createExpressApp = async (): Promise<Application> => {
  const app = express();

  // Trust proxy configuration based on environment
  // Critical for rate limiting and security when behind load balancers
  if (NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy (ALB/ELB)
    logger.info('Trust proxy enabled for production environment');
  } else {
    app.set('trust proxy', false);
    logger.info('Trust proxy disabled for development environment');
  }

  // Disable Express server signature for security
  app.disable('x-powered-by');

  // Request ID middleware (must be first for proper tracking)
  app.use(requestIdMiddleware);

  // Compression middleware (early in the stack for maximum benefit)
  app.use(compression({
    level: NODE_ENV === 'production' ? 6 : 1, // Higher compression in production
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress responses with this request header
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Fallback to standard filter function
      return compression.filter(req, res);
    }
  }));

  // Security middleware stack
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        scriptSrc: ["'self'", "https://checkout.razorpay.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:"],
        frameSrc: ["'self'", "https://api.razorpay.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  }));

  // Enhanced rate limiting with different limits for different endpoints
  const createRateLimiter = (maxRequests: number, windowMinutes: number = 15) => {
    return rateLimit({
      windowMs: windowMinutes * 60 * 1000,
      max: maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: windowMinutes * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Rate limit handler with security logging
      handler: (req: Request, res: Response) => {
        securityLogger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          error: 'Too many requests from this IP, please try again later.',
          retryAfter: windowMinutes * 60
        });
      },
      skip: (req: Request): boolean => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/ping';
      }
    });
  };

  // Global rate limiter
  app.use(createRateLimiter(NODE_ENV === 'production' ? 100 : 1000));

  // Stricter rate limiting for auth endpoints
  // app.use('/api/auth', createRateLimiter(20, 15));

  // Very strict rate limiting for password reset
  // app.use('/api/auth/forgot-password', createRateLimiter(5, 60));

  // CORS configuration with environment-specific origins
  const allowedOrigins = NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL || 'https://yourdomain.com',
        process.env.ADMIN_URL || 'https://admin.yourdomain.com'
      ]
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000'
      ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log unauthorized CORS attempts
      securityLogger.warn('Unauthorized CORS attempt', {
        origin,
        allowedOrigins
      });

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
      'X-Request-ID'
    ],
    exposedHeaders: ['Set-Cookie', 'X-Request-ID'],
    maxAge: NODE_ENV === 'production' ? 86400 : 0 // Cache preflight for 24h in production
  }));

  // Morgan HTTP request logger with custom format
  const morganFormat = NODE_ENV === 'production'
    ? 'combined'
    : ':method :url :status :res[content-length] - :response-time ms';

  app.use(morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    },
    // Skip logging for health checks in production
    skip: (req: Request) => {
      return NODE_ENV === 'production' &&
             (req.path === '/health' || req.path === '/ping');
    }
  }));

  // Performance monitoring middleware
  // app.use(performanceMiddleware);

  // Security monitoring middleware
  // app.use(securityMiddleware);

  // WEBHOOK: Raw body for webhook signature verification
  // IMPORTANT: Must be before JSON parsing
  app.use('/api/clerk/webhook', express.raw({
    type: 'application/json',
    limit: '1mb'
  }));

  // Body parsing middleware
  app.use(cookieParser());
  app.use(requestLogger);

  // JSON parsing with size limits
  app.use(express.json({
    limit: NODE_ENV === 'production' ? '10mb' : '50mb',
    verify: (req: any, res: Response, buf: Buffer) => {
      // Store raw body for webhook verification
      req.rawBody = buf;
    }
  }));

  app.use(express.urlencoded({
    extended: true,
    limit: NODE_ENV === 'production' ? '10mb' : '50mb'
  }));

  // Static file serving with proper caching
  // app.use('/uploads', express.static('public/uploads', {
  //   maxAge: NODE_ENV === 'production' ? '1y' : '0',
  //   etag: true,
  //   lastModified: true
  // }));

  // Health check endpoint (before authentication)
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Server is running successfully!',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime())
    });
  });

  // API routes with versioning
  // app.use('/api/v1/auth', AuthRouter);
  // app.use('/api/v1/courses', CourseRouter);
  // app.use('/api/v1/lectures', LectureRouter);
  // app.use('/api/v1/orders', OrderRouter);
  // app.use('/api/v1/lecture-progress', LectureProgressRouter);

  // Legacy routes (to be deprecated)
  // app.use('/api', AuthRouter);
  // app.use('/course', CourseRouter);
  // app.use('/lecture', LectureRouter);
  // app.use('/order', OrderRouter);
  // app.use('/lecture-progress', LectureProgressRouter);

  // API documentation endpoint
  app.get('/api/docs', (req: Request, res: Response) => {
    res.json({
      message: 'AWS LMS API Documentation',
      version: '1.0.0',
      endpoints: {
        auth: '/api/v1/auth',
        courses: '/api/v1/courses',
        lectures: '/api/v1/lectures',
        orders: '/api/v1/orders',
        progress: '/api/v1/lecture-progress'
      },
      health: '/health',
      environment: NODE_ENV
    });
  });

  // 404 handler for undefined routes
  app.use('*', (req: Request, res: Response) => {
    const message = `Route ${req.method} ${req.originalUrl} not found`;
    logger.warn(message, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  });

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  return app;
};

// Legacy export for backward compatibility
export const ExpressApp = createExpressApp;
