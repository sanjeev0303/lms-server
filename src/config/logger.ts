import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { NODE_ENV } from '@/env';

// Custom log format for production
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (stack) {
      log += `\nStack: ${stack}`;
    }

    if (Object.keys(meta).length > 0) {
      log += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`;

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Daily rotate file transport for errors
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  handleExceptions: true,
  handleRejections: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: customFormat,
});

// Daily rotate file transport for all logs
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: customFormat,
});

// Console transport
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  handleExceptions: true,
  handleRejections: true,
});

// Create logger instance
const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  defaultMeta: {
    service: 'aws-lms-server',
    environment: NODE_ENV,
  },
  transports: [
    // Always include console in development
    ...(NODE_ENV !== 'production' ? [consoleTransport] : []),
    // File transports for production
    ...(NODE_ENV === 'production' ? [errorFileTransport, combinedFileTransport] : []),
  ],
  exitOnError: false,
});

// Add console transport in production for debugging (but with higher log level)
if (NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    level: 'warn',
    format: consoleFormat,
  }));
}

// Performance monitoring logger
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'performance',
    environment: NODE_ENV,
  },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
});

// Security events logger
export const securityLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'security',
    environment: NODE_ENV,
  },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});

// Audit logger for business events
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'audit',
    environment: NODE_ENV,
  },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d', // Keep audit logs longer
    }),
  ],
});

export { logger };
export default logger;
