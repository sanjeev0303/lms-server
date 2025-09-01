# 🚀 AWS LMS Server - Production-Ready Express.js API

[![Build Status](https://github.com/your-username/aws-lms-deploy/workflows/CI/badge.svg)](https://github.com/your-username/aws-lms-deploy/actions)
[![Coverage Status](https://codecov.io/gh/your-username/aws-lms-deploy/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/aws-lms-deploy)
[![Docker Pulls](https://img.shields.io/docker/pulls/your-username/aws-lms-server)](https://hub.docker.com/r/your-username/aws-lms-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready, scalable Express.js server for the AWS Learning Management System (LMS) platform. Built with TypeScript, featuring comprehensive security, monitoring, and deployment automation.

## ✨ Features

### 🏗️ Architecture & Performance
- **Modern TypeScript**: Fully typed with strict mode enabled
- **Express.js 5**: Latest features with enhanced performance
- **Prisma ORM**: Type-safe database operations with PostgreSQL
- **Redis Caching**: High-performance caching layer
- **Compression**: Gzip compression for optimal bandwidth usage
- **Request Optimization**: Connection pooling and keep-alive

### 🛡️ Security
- **Helmet.js**: Comprehensive security headers
- **Rate Limiting**: IP-based with customizable thresholds
- **CORS**: Environment-specific origin validation
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Zod schema validation for all endpoints
- **Security Monitoring**: Real-time threat detection and logging

### 📊 Monitoring & Logging
- **Winston Logging**: Structured logging with rotation
- **Performance Monitoring**: Request timing and memory usage tracking
- **Health Checks**: Comprehensive endpoint for load balancer integration
- **Error Tracking**: Centralized error handling and reporting
- **Audit Logging**: Business event tracking for compliance

### 🚀 DevOps & Deployment
- **Docker**: Multi-stage builds with security best practices
- **Docker Compose**: Complete local development environment
- **GitHub Actions**: Automated CI/CD pipeline
- **AWS Deployment**: EC2 with Auto Scaling and Load Balancing
- **Nginx**: Reverse proxy with SSL termination and caching

### 🔧 Developer Experience
- **Hot Reload**: Nodemon for development
- **Code Quality**: ESLint + Prettier + TypeScript strict mode
- **Testing**: Jest with coverage reporting
- **API Documentation**: Auto-generated OpenAPI specs
- **Environment Validation**: Joi-based configuration validation

## 📁 Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files (database, logging, etc.)
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware (auth, validation, etc.)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer
│   ├── types/           # TypeScript type definitions
│   ├── interfaces/      # Interface definitions
│   ├── dto/             # Data transfer objects
│   ├── utils/           # Utility functions
│   ├── env/             # Environment configuration
│   ├── express-app.ts   # Express application setup
│   └── index.ts         # Application entry point
├── prisma/              # Database schema and migrations
├── nginx/               # Nginx configuration
├── logs/                # Application logs
├── public/              # Static assets
├── __tests__/           # Test files
├── .github/             # GitHub Actions workflows
├── docker-compose.yml   # Local development environment
├── Dockerfile           # Production container definition
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### 1. Clone Repository
```bash
git clone https://github.com/your-username/aws-lms-deploy.git
cd aws-lms-deploy/server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### 5. Start Development Server
```bash
# Development mode with hot reload
npm run dev

# Debug mode
npm run dev:debug
```

The server will start at `http://localhost:5000`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | ✅ |
| `PORT` | Server port | `5000` | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | - | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `REDIS_URL` | Redis connection string | - | ❌ |
| `CLERK_SECRET_KEY` | Clerk authentication secret | - | ❌ |
| `CLOUDINARY_*` | Cloudinary configuration | - | ❌ |
| `RAZORPAY_*` | Razorpay payment configuration | - | ❌ |

> See [.env.example](.env.example) for complete list

### Configuration Validation

The application uses Joi for robust environment validation:

```typescript
// All environment variables are validated at startup
const config = {
  NODE_ENV: 'production',
  PORT: 5000,
  DATABASE_URL: 'postgresql://...',
  // ... other validated configs
};
```

## 📚 API Documentation

### Core Endpoints

#### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - User logout

#### Courses
- `GET /api/v1/courses` - List all courses
- `POST /api/v1/courses` - Create new course
- `GET /api/v1/courses/:id` - Get course details
- `PUT /api/v1/courses/:id` - Update course
- `DELETE /api/v1/courses/:id` - Delete course

#### Lectures
- `GET /api/v1/lectures/:courseId` - Get course lectures
- `POST /api/v1/lectures` - Create new lecture
- `PUT /api/v1/lectures/:id` - Update lecture
- `DELETE /api/v1/lectures/:id` - Delete lecture

#### Health & Monitoring
- `GET /health` - Health check endpoint
- `GET /api/docs` - API documentation

### Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Handling

Errors are returned with appropriate HTTP status codes:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts
```

### Test Structure
```bash
__tests__/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
├── fixtures/      # Test data
├── helpers/       # Test utilities
└── setup.ts       # Test configuration
```

### Writing Tests
```typescript
import { request } from 'supertest';
import { app } from '../src/app';

describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});
```

## 🚀 Deployment

### Docker Deployment

#### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

#### Production
```bash
# Build production image
docker build -t aws-lms-server .

# Run production container
docker run -d \
  --name aws-lms-server \
  -p 5000:5000 \
  --env-file .env.production \
  aws-lms-server
```

### AWS EC2 Deployment

Follow the comprehensive [Deployment Guide](DEPLOYMENT_GUIDE.md) for:
- Infrastructure setup with Terraform
- Auto Scaling Groups configuration
- Load Balancer setup with SSL
- CI/CD pipeline configuration
- Monitoring and alerting setup

### Key Deployment Features

#### Zero-Downtime Deployments
```bash
# Rolling deployment script
./scripts/deploy.sh production
```

#### Health Checks
```bash
# Load balancer health check
curl -f https://your-domain.com/health

# Response:
{
  "success": true,
  "message": "Server is running successfully!",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "version": "1.0.0",
  "uptime": 3600
}
```

#### Auto Scaling
- CPU-based scaling (target: 70%)
- Memory-based scaling (target: 80%)
- Custom metrics scaling (response time, error rate)

## 📊 Monitoring

### Logging

The application uses structured logging with different log levels:

```typescript
import { logger, auditLogger, securityLogger } from '@/config/logger';

// Application logs
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
logger.error('Database connection failed', { error: err.message });

// Security events
securityLogger.warn('Suspicious activity detected', {
  ip: '192.168.1.1',
  attempts: 5
});

// Business events
auditLogger.info('Course created', {
  courseId: '456',
  userId: '123',
  action: 'CREATE_COURSE'
});
```

### Performance Monitoring

Built-in performance monitoring tracks:
- Request duration
- Memory usage
- Database query performance
- Cache hit rates
- Error rates

### Health Monitoring

The `/health` endpoint provides comprehensive system status:

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "external_apis": "operational"
  },
  "metrics": {
    "uptime": 3600,
    "memory_usage": "45%",
    "cpu_usage": "12%",
    "response_time": "120ms"
  }
}
```

## 🔧 Development

### Code Quality

#### Linting & Formatting
```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check TypeScript types
npm run typecheck
```

#### Pre-commit Hooks
```bash
# Install husky for git hooks
npm run prepare

# Hooks run automatically on commit:
# - ESLint check
# - Prettier formatting
# - TypeScript compilation
# - Unit tests
```

### Database Operations

#### Migrations
```bash
# Create new migration
npx prisma migrate dev --name add-user-table

# Apply migrations (production)
npm run prisma:deploy

# Reset database (development only)
npx prisma migrate reset
```

#### Prisma Studio
```bash
# Open database browser
npm run prisma:studio
```

### API Development

#### Adding New Routes
1. Create controller in `src/controllers/`
2. Add service in `src/services/`
3. Define routes in `src/routes/`
4. Add validation schemas in `src/dto/`
5. Write tests in `__tests__/`

#### Example: Adding a new endpoint
```typescript
// src/controllers/user-controller.ts
export class UserController {
  async getProfile(req: Request, res: Response) {
    const userId = req.user.id;
    const user = await this.userService.getProfile(userId);

    return ResponseHandler.success(res, user, 'Profile retrieved successfully');
  }
}

// src/routes/user-router.ts
router.get('/profile', authenticateToken, userController.getProfile);
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Use conventional commit messages
- Ensure all CI checks pass

### Code Review Process

- All PRs require at least 2 approvals
- Automated tests must pass
- Security scan must pass
- Performance impact assessment
- Documentation updates required

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Express.js** - Fast, unopinionated web framework
- **Prisma** - Next-generation ORM for Node.js
- **Winston** - Universal logging library
- **Jest** - JavaScript testing framework
- **TypeScript** - Typed superset of JavaScript

## 📞 Support

- **Documentation**: [API Docs](https://your-domain.com/api/docs)
- **Issues**: [GitHub Issues](https://github.com/your-username/aws-lms-deploy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/aws-lms-deploy/discussions)
- **Email**: support@your-domain.com

---

<div align="center">

**Built with ❤️ for scalable learning platforms**

[⭐ Star this repo](https://github.com/your-username/aws-lms-deploy) • [🐛 Report Bug](https://github.com/your-username/aws-lms-deploy/issues) • [✨ Request Feature](https://github.com/your-username/aws-lms-deploy/issues)

</div>
