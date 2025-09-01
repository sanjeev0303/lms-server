# LMS Server

A comprehensive Learning Management System (LMS) server built with Node.js, TypeScript, Express, Prisma, and Neon Database.

## 🚀 Features

- **User Management**: Complete authentication system with Clerk
- **Course Management**: Create, update, and manage courses and lectures
- **Payment Integration**: Razorpay payment gateway integration
- **File Uploads**: Cloudinary integration for media files
- **Progress Tracking**: Track student progress through courses
- **Order Management**: Complete order and enrollment system
- **RESTful API**: Comprehensive API endpoints
- **Docker Support**: Containerized deployment with Neon database

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Neon (PostgreSQL) with Prisma ORM
- **Authentication**: Clerk
- **Payments**: Razorpay
- **File Storage**: Cloudinary
- **Containerization**: Docker & Docker Compose
- **Proxy**: Nginx

## 📋 Prerequisites

- Node.js 18+ or Docker
- Neon Database account
- Clerk account for authentication
- Razorpay account for payments
- Cloudinary account for file uploads

## 🚀 Quick Start

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd server
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your credentials:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Neon Database
DATABASE_URL='your-neon-database-url'

# Clerk Authentication
CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"
CLERK_WEBHOOK_SECRET="your-clerk-webhook-secret"

# Payment Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret

# File Upload Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Development Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

3. Start development server:
```bash
npm run dev
```

The server will be available at `http://localhost:5000`

### Docker Deployment

1. Make sure Docker and Docker Compose are installed

2. Build and run with Docker Compose:
```bash
docker-compose up -d
```

3. Check logs:
```bash
docker-compose logs -f
```

The application will be available at:
- Direct API: `http://localhost:5000`
- Nginx Proxy: `http://localhost`

## 📁 Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── dto/            # Data Transfer Objects
├── env/            # Environment validation
├── interfaces/     # TypeScript interfaces
├── middleware/     # Express middleware
├── repositories/   # Data access layer
├── routes/         # API routes
├── services/       # Business logic
├── types/          # Type definitions
└── utils/          # Utility functions

prisma/
├── schema.prisma   # Database schema
└── migrations/     # Database migrations

public/
└── uploads/        # File uploads directory
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/webhook` - Clerk webhook handler

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user

### Courses
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create course
- `GET /api/courses/:id` - Get course by ID
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Lectures
- `GET /api/lectures` - Get lectures
- `POST /api/lectures` - Create lecture
- `PUT /api/lectures/:id` - Update lecture
- `DELETE /api/lectures/:id` - Delete lecture

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `POST /api/orders/verify` - Verify payment

### Progress
- `POST /api/progress` - Update progress
- `GET /api/progress/:userId/:courseId` - Get progress

## 🗄️ Database

This project uses Neon (PostgreSQL) as the primary database with Prisma as the ORM.

### Schema Management

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Create migration
npx prisma migrate dev --name your-migration-name

# Reset database (development only)
npx prisma migrate reset
```

### Database Schema

The database includes the following main entities:
- **User**: User management with Clerk integration
- **Course**: Course information and metadata
- **Lecture**: Individual course lectures
- **Order**: Payment and enrollment orders
- **Review**: Course reviews and ratings
- **Progress**: Student progress tracking

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `DATABASE_URL` | Neon database connection string | Yes |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook secret | Yes |
| `JWT_SECRET` | JWT secret for legacy auth | Yes |
| `CLIENT_URL` | Frontend application URL | Yes |
| `RAZORPAY_KEY_ID` | Razorpay key ID | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |

## 🐳 Docker Commands

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Execute commands in running container
docker exec -it lms-server bash
```

## 🔍 Health Checks

The application includes health check endpoints:

- `GET /health` - Basic health check
- `GET /api/health` - API health check

## 📝 Logging

Logs are organized by type:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/audit.log` - Audit logs
- `logs/performance.log` - Performance logs
- `logs/security.log` - Security logs

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Local Development

1. Make sure Docker and Docker Compose are installed

2. Build and run with Docker Compose:
```bash
docker-compose up -d
```

3. Check logs:
```bash
docker-compose logs -f
```

The application will be available at:
- Direct API: `http://localhost:5000`
- Nginx Proxy: `http://localhost`

### Production Deployment on Render

#### Quick Start

1. **Run the setup script** to get environment variables:
```bash
./render-setup.sh
```

2. **Test your deployment locally**:
```bash
./deploy-test.sh
```

3. **Deploy to Render**:
   - Push code to GitHub
   - Create Web Service on Render
   - Configure environment variables from setup script
   - Deploy!

#### Detailed Guide

For complete step-by-step instructions, see: **[RENDER_DEPLOYMENT_GUIDE.md](../RENDER_DEPLOYMENT_GUIDE.md)**

#### Render Configuration

- **Build Command**: `npm run render:build`
- **Start Command**: `npm run render:start`
- **Health Check Path**: `/health`
- **Environment**: Node.js 18+
- **Root Directory**: `server`

#### Environment Variables for Render

```env
NODE_ENV=production
DATABASE_URL=your_neon_database_url
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
JWT_SECRET=generated_secure_secret
CLIENT_URL=https://your-client-app.onrender.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your_secret
```

### Other Deployment Options

The application is containerized and can be deployed on:
- **Render** (Recommended - managed Node.js hosting)
- **Railway** (Alternative managed hosting)
- **DigitalOcean App Platform**
- **AWS ECS/Fargate** (with Docker)
- **Google Cloud Run** (with Docker)
- **Azure Container Instances** (with Docker)

## 🔒 Security

- CORS configured for client application
- Rate limiting implemented
- Input validation with DTOs
- Secure headers with Helmet
- Environment variables for sensitive data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.
