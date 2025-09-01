import { Request, Response, NextFunction } from 'express';
import { securityLogger } from '@/config/logger';

/**
 * Security monitoring middleware
 * Detects and logs suspicious activities
 */
export const securityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const suspiciousPatterns = [
    // SQL Injection patterns
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    // XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // Path traversal
    /\.\.\//,
    // Command injection
    /[;&|`]/,
  ];

  const userAgent = req.get('User-Agent') || '';
  const requestBody = JSON.stringify(req.body);
  const queryString = JSON.stringify(req.query);
  const urlPath = req.originalUrl;

  // Check for suspicious patterns in request
  const checkForSuspiciousContent = (content: string, source: string) => {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        securityLogger.warn('Suspicious pattern detected', {
          pattern: pattern.toString(),
          source,
          content: content.substring(0, 200), // Limit content length
          requestId: req.headers['x-request-id'],
          ip: req.ip,
          userAgent,
          method: req.method,
          url: urlPath
        });
        break;
      }
    }
  };

  // Check various request parts
  checkForSuspiciousContent(requestBody, 'request_body');
  checkForSuspiciousContent(queryString, 'query_params');
  checkForSuspiciousContent(urlPath, 'url_path');

  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i,
    /masscan/i,
    /zap/i
  ];

  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      securityLogger.warn('Suspicious user agent detected', {
        userAgent,
        ip: req.ip,
        method: req.method,
        url: urlPath,
        requestId: req.headers['x-request-id']
      });
      break;
    }
  }

  // Check for rapid requests from same IP (simple rate monitoring)
  const currentTime = Date.now();
  const ipKey = req.ip || 'unknown';

  if (!req.app.locals.ipRequestTimes) {
    req.app.locals.ipRequestTimes = new Map();
  }

  const ipRequests = req.app.locals.ipRequestTimes.get(ipKey) || [];
  const recentRequests = ipRequests.filter((time: number) => currentTime - time < 60000); // Last minute

  if (recentRequests.length > 50) { // More than 50 requests per minute
    securityLogger.warn('Rapid requests detected', {
      ip: req.ip,
      requestCount: recentRequests.length,
      timeWindow: '1 minute',
      method: req.method,
      url: urlPath,
      requestId: req.headers['x-request-id']
    });
  }

  // Update request times
  recentRequests.push(currentTime);
  req.app.locals.ipRequestTimes.set(ipKey, recentRequests);

  // Clean up old entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    const cutoffTime = currentTime - 300000; // 5 minutes ago
    for (const [ip, times] of req.app.locals.ipRequestTimes.entries()) {
      const filteredTimes = times.filter((time: number) => time > cutoffTime);
      if (filteredTimes.length === 0) {
        req.app.locals.ipRequestTimes.delete(ip);
      } else {
        req.app.locals.ipRequestTimes.set(ip, filteredTimes);
      }
    }
  }

  // Check for large request bodies that might indicate DoS
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  if (contentLength > 10 * 1024 * 1024) { // 10MB
    securityLogger.warn('Large request body detected', {
      contentLength,
      ip: req.ip,
      method: req.method,
      url: urlPath,
      requestId: req.headers['x-request-id']
    });
  }

  next();
};

/**
 * IP whitelist middleware
 * Only allow requests from whitelisted IPs in production
 */
export const ipWhitelistMiddleware = (whitelist: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip;

    if (!clientIP || !whitelist.includes(clientIP)) {
      securityLogger.warn('Unauthorized IP access attempt', {
        ip: clientIP,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id']
      });

      res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'IP_NOT_WHITELISTED'
      });
      return;
    }

    next();
  };
};

/**
 * API key validation middleware
 * Validates API keys for machine-to-machine communication
 */
export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!apiKey) {
    securityLogger.warn('Missing API key', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      requestId: req.headers['x-request-id']
    });

    res.status(401).json({
      success: false,
      message: 'API key required',
      code: 'MISSING_API_KEY'
    });
    return;
  }

  if (!validApiKeys.includes(apiKey)) {
    securityLogger.warn('Invalid API key', {
      apiKey: apiKey.substring(0, 8) + '...',
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      requestId: req.headers['x-request-id']
    });

    res.status(401).json({
      success: false,
      message: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
    return;
  }

  next();
};
