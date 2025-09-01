import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variables validation schema
 * Ensures all required environment variables are present and valid
 */
const envSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(5000),

  // Database Configuration
  DATABASE_URL: Joi.string().uri().required(),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // Client URLs
  CLIENT_URL: Joi.string().uri().default('http://localhost:3000'),
  FRONTEND_URL: Joi.string().uri().optional(),
  ADMIN_URL: Joi.string().uri().optional(),

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),

  // Razorpay Configuration
  RAZORPAY_KEY_ID: Joi.string().optional(),
  RAZORPAY_KEY_SECRET: Joi.string().optional(),

  // Clerk Configuration
  CLERK_SECRET_KEY: Joi.string().optional(),
  CLERK_PUBLISHABLE_KEY: Joi.string().optional(),
  CLERK_WEBHOOK_SECRET: Joi.string().optional(),

  // External Services
  WEBHOOK_SECRET: Joi.string().optional(),

  // Security
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),

  // Feature Flags
  ENABLE_RATE_LIMITING: Joi.boolean().default(true),
  ENABLE_LOGGING: Joi.boolean().default(true),
  ENABLE_CORS: Joi.boolean().default(true),
  ENABLE_COMPRESSION: Joi.boolean().default(true),

  // Performance
  MAX_REQUEST_SIZE: Joi.string().default('10mb'),
  REQUEST_TIMEOUT_MS: Joi.number().default(30000),

  // AWS Configuration (for deployment)
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_S3_BUCKET: Joi.string().optional(),

  // Monitoring & Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  SENTRY_DSN: Joi.string().uri().optional(),

  // Email Configuration (if using email service)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_USER: Joi.string().email().optional(),
  SMTP_PASS: Joi.string().optional(),

  // Redis Configuration (for caching/sessions)
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().port().optional(),
  REDIS_PASSWORD: Joi.string().optional(),

  // API Keys for external services
  VALID_API_KEYS: Joi.string().optional(), // Comma-separated list

  // Health Check
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),

  // SSL/TLS
  SSL_CERT_PATH: Joi.string().optional(),
  SSL_KEY_PATH: Joi.string().optional(),
}).unknown(); // Allow unknown environment variables

/**
 * Validate environment variables
 */
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

/**
 * Validated and typed environment variables
 */
export const config = {
  // Server Configuration
  NODE_ENV: envVars.NODE_ENV as 'development' | 'test' | 'staging' | 'production',
  PORT: envVars.PORT as number,

  // Database
  DATABASE_URL: envVars.DATABASE_URL as string,

  // JWT
  JWT_SECRET: envVars.JWT_SECRET as string,
  JWT_EXPIRES_IN: envVars.JWT_EXPIRES_IN as string,
  JWT_REFRESH_SECRET: envVars.JWT_REFRESH_SECRET as string | undefined,
  JWT_REFRESH_EXPIRES_IN: envVars.JWT_REFRESH_EXPIRES_IN as string,

  // URLs
  CLIENT_URL: envVars.CLIENT_URL as string,
  FRONTEND_URL: envVars.FRONTEND_URL as string | undefined,
  ADMIN_URL: envVars.ADMIN_URL as string | undefined,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: envVars.CLOUDINARY_CLOUD_NAME as string | undefined,
  CLOUDINARY_API_KEY: envVars.CLOUDINARY_API_KEY as string | undefined,
  CLOUDINARY_API_SECRET: envVars.CLOUDINARY_API_SECRET as string | undefined,

  // Razorpay
  RAZORPAY_KEY_ID: envVars.RAZORPAY_KEY_ID as string | undefined,
  RAZORPAY_KEY_SECRET: envVars.RAZORPAY_KEY_SECRET as string | undefined,

  // Clerk
  CLERK_SECRET_KEY: envVars.CLERK_SECRET_KEY as string | undefined,
  CLERK_PUBLISHABLE_KEY: envVars.CLERK_PUBLISHABLE_KEY as string | undefined,
  CLERK_WEBHOOK_SECRET: envVars.CLERK_WEBHOOK_SECRET as string | undefined,

  // Security
  RATE_LIMIT_WINDOW_MS: envVars.RATE_LIMIT_WINDOW_MS as number,
  RATE_LIMIT_MAX_REQUESTS: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  BCRYPT_ROUNDS: envVars.BCRYPT_ROUNDS as number,

  // Feature Flags
  ENABLE_RATE_LIMITING: envVars.ENABLE_RATE_LIMITING as boolean,
  ENABLE_LOGGING: envVars.ENABLE_LOGGING as boolean,
  ENABLE_CORS: envVars.ENABLE_CORS as boolean,
  ENABLE_COMPRESSION: envVars.ENABLE_COMPRESSION as boolean,

  // Performance
  MAX_REQUEST_SIZE: envVars.MAX_REQUEST_SIZE as string,
  REQUEST_TIMEOUT_MS: envVars.REQUEST_TIMEOUT_MS as number,

  // AWS
  AWS_REGION: envVars.AWS_REGION as string,
  AWS_ACCESS_KEY_ID: envVars.AWS_ACCESS_KEY_ID as string | undefined,
  AWS_SECRET_ACCESS_KEY: envVars.AWS_SECRET_ACCESS_KEY as string | undefined,
  AWS_S3_BUCKET: envVars.AWS_S3_BUCKET as string | undefined,

  // Monitoring
  LOG_LEVEL: envVars.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug' | 'trace',
  SENTRY_DSN: envVars.SENTRY_DSN as string | undefined,

  // Redis
  REDIS_URL: envVars.REDIS_URL as string | undefined,
  REDIS_HOST: envVars.REDIS_HOST as string | undefined,
  REDIS_PORT: envVars.REDIS_PORT as number | undefined,
  REDIS_PASSWORD: envVars.REDIS_PASSWORD as string | undefined,

  // API Keys
  VALID_API_KEYS: envVars.VALID_API_KEYS?.split(',') || [],

  // Health Check
  HEALTH_CHECK_ENABLED: envVars.HEALTH_CHECK_ENABLED as boolean,

  // SSL
  SSL_CERT_PATH: envVars.SSL_CERT_PATH as string | undefined,
  SSL_KEY_PATH: envVars.SSL_KEY_PATH as string | undefined,
};

/**
 * Helper functions for environment checking
 */
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isProduction = () => config.NODE_ENV === 'production';
export const isTest = () => config.NODE_ENV === 'test';
export const isStaging = () => config.NODE_ENV === 'staging';

/**
 * Legacy exports for backward compatibility
 */
export const NODE_ENV = config.NODE_ENV;
export const PORT = config.PORT;
export const DATABASE_URL = config.DATABASE_URL;
export const JWT_SECRET = config.JWT_SECRET;
export const JWT_EXPIRES_IN = config.JWT_EXPIRES_IN;
export const CLIENT_URL = config.CLIENT_URL;

/**
 * Environment configuration summary
 */
export const getEnvironmentSummary = () => ({
  NODE_ENV: config.NODE_ENV,
  PORT: config.PORT,
  DATABASE_CONNECTED: !!config.DATABASE_URL,
  JWT_CONFIGURED: !!config.JWT_SECRET,
  CLOUDINARY_CONFIGURED: !!(config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY),
  RAZORPAY_CONFIGURED: !!(config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET),
  CLERK_CONFIGURED: !!config.CLERK_SECRET_KEY,
  LOGGING_ENABLED: config.ENABLE_LOGGING,
  RATE_LIMITING_ENABLED: config.ENABLE_RATE_LIMITING,
  timestamp: new Date().toISOString()
});

export default config;
