import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Server Configuration
export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL!;

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET!;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// CORS Configuration - Render-optimized
export const CLIENT_URL = process.env.CLIENT_URL ||
  (NODE_ENV === 'production' ? 'https://your-client-app.onrender.com' : 'http://localhost:3000');

// Cloudinary Configuration (Optional for development)
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'demo';
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'demo';
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'demo';

// Razorpay Configuration (Optional)
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// BCRYPT Configuration
export const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');

// Clerk Configuration
export const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;
export const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
export const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

// Render-specific configuration
export const IS_RENDER = process.env.RENDER === 'true';
export const RENDER_SERVICE_URL = process.env.RENDER_EXTERNAL_URL;
