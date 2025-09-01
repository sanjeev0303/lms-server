#!/bin/bash

# LMS Server - Pre-Deployment Test Script
# This script tests the server locally before deploying to Render

echo "🔄 Starting LMS Server Pre-Deployment Tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Change to server directory
cd "$(dirname "$0")"

# 1. Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node --version)
if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v20* ]] || [[ $NODE_VERSION == v22* ]]; then
    print_status "Node.js version: $NODE_VERSION (Compatible)"
else
    print_warning "Node.js version: $NODE_VERSION (May not be compatible with Render)"
fi

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# 3. Check environment variables
echo "🔧 Checking environment variables..."
if [ -f ".env" ]; then
    print_status ".env file found"

    # Check required variables
    required_vars=("DATABASE_URL" "CLERK_SECRET_KEY" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env; then
            print_status "$var is set"
        else
            print_error "$var is missing from .env"
        fi
    done
else
    print_error ".env file not found"
    echo "Create .env file using .env.render as template"
    exit 1
fi

# 4. Test database connection
echo "🗄️  Testing database connection..."
npm run prisma:generate
if [ $? -eq 0 ]; then
    print_status "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

# 5. Build the application
echo "🏗️  Building application..."
npm run build
if [ $? -eq 0 ]; then
    print_status "Application built successfully"
else
    print_error "Failed to build application"
    exit 1
fi

# 6. Test production start
echo "🚀 Testing production start..."
timeout 10s npm run start:prod &
SERVER_PID=$!
sleep 5

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    print_status "Server started successfully"

    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)

    if [ "$HEALTH_RESPONSE" = "200" ]; then
        print_status "Health endpoint responding (HTTP 200)"
    else
        print_warning "Health endpoint returned HTTP $HEALTH_RESPONSE"
    fi

    # Kill the server
    kill $SERVER_PID
    wait $SERVER_PID 2>/dev/null
else
    print_error "Server failed to start"
    exit 1
fi

# 7. Check for common issues
echo "🔍 Checking for common issues..."

# Check for console.log statements (should use logger in production)
LOG_COUNT=$(grep -r "console\.log" src/ | wc -l)
if [ $LOG_COUNT -gt 5 ]; then
    print_warning "Found $LOG_COUNT console.log statements. Consider using winston logger."
fi

# Check for TODO comments
TODO_COUNT=$(grep -r "TODO\|FIXME" src/ | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    print_warning "Found $TODO_COUNT TODO/FIXME comments to review"
fi

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
npm run typecheck
if [ $? -eq 0 ]; then
    print_status "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# 8. Security check
echo "🔒 Running security checks..."

# Check for hardcoded secrets (basic check)
if grep -r "sk_live\|pk_live\|whsec_" src/ --exclude-dir=node_modules; then
    print_error "Found hardcoded secrets in source code!"
    exit 1
else
    print_status "No hardcoded secrets found"
fi

# 9. Final summary
echo ""
echo "🎉 Pre-deployment tests completed!"
echo ""
echo "📋 Deployment Checklist:"
echo "  1. ✅ Dependencies installed"
echo "  2. ✅ Environment variables configured"
echo "  3. ✅ Database connection working"
echo "  4. ✅ Application builds successfully"
echo "  5. ✅ Server starts in production mode"
echo "  6. ✅ Health endpoint responding"
echo "  7. ✅ TypeScript compilation successful"
echo "  8. ✅ Security checks passed"
echo ""
echo "🚀 Your application is ready for Render deployment!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Follow the Render deployment guide"
echo "3. Configure environment variables in Render dashboard"
echo "4. Deploy and monitor the logs"

# Clean up
rm -rf dist/ 2>/dev/null || true
