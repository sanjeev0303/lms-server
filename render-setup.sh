#!/bin/bash

# LMS Server - Render Quick Start Script
# This script helps you quickly set up environment variables for Render

echo "🚀 LMS Server - Render Deployment Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to generate a secure JWT secret
generate_jwt_secret() {
    openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64
}

echo ""
print_header "Environment Variables for Render Deployment"
echo ""

print_info "Copy and paste these environment variables into your Render dashboard:"
echo ""

echo "# ===== CORE CONFIGURATION ====="
echo "NODE_ENV=production"
echo "PORT=10000"
echo ""

echo "# ===== DATABASE ====="
echo "DATABASE_URL=postgresql://your_neon_user:your_password@your_host:5432/your_database?sslmode=require"
print_warning "⚠️  Replace with your actual Neon database URL"
echo ""

echo "# ===== AUTHENTICATION (CLERK) ====="
echo "CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key"
echo "CLERK_SECRET_KEY=sk_live_your_clerk_secret_key"
echo "CLERK_WEBHOOK_SECRET=whsec_your_clerk_webhook_secret"
print_warning "⚠️  Use your production Clerk keys (pk_live_... and sk_live_...)"
echo ""

echo "# ===== JWT CONFIGURATION ====="
JWT_SECRET=$(generate_jwt_secret)
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_EXPIRES_IN=7d"
print_info "✅ Generated secure JWT secret"
echo ""

echo "# ===== CLIENT CONFIGURATION ====="
echo "CLIENT_URL=https://your-client-app.onrender.com"
print_warning "⚠️  Replace with your actual client app URL"
echo ""

echo "# ===== SECURITY ====="
echo "BCRYPT_SALT_ROUNDS=12"
echo ""

echo "# ===== PAYMENT (RAZORPAY) ====="
echo "RAZORPAY_KEY_ID=rzp_live_your_razorpay_key_id"
echo "RAZORPAY_KEY_SECRET=your_razorpay_secret_key"
print_warning "⚠️  Use your production Razorpay keys (rzp_live_...)"
echo ""

echo "# ===== FILE UPLOAD (CLOUDINARY) ====="
echo "CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name"
echo "CLOUDINARY_API_KEY=your_cloudinary_api_key"
echo "CLOUDINARY_API_SECRET=your_cloudinary_api_secret"
print_warning "⚠️  Replace with your actual Cloudinary credentials"
echo ""

echo "================================================"
print_header "Render Service Configuration"
echo ""

echo "📝 Service Settings:"
echo "   • Name: lms-server"
echo "   • Environment: Node"
echo "   • Region: Oregon (or closest to your users)"
echo "   • Plan: Starter (or higher based on needs)"
echo "   • Root Directory: server"
echo ""

echo "🔧 Build & Deploy Commands:"
echo "   • Build Command: npm run render:build"
echo "   • Start Command: npm run render:start"
echo ""

echo "🏥 Health Check:"
echo "   • Health Check Path: /health"
echo ""

echo "================================================"
print_header "Deployment Steps Summary"
echo ""

echo "1. 📁 Push your code to GitHub"
echo "2. 🌐 Go to render.com and create a new Web Service"
echo "3. 🔗 Connect your GitHub repository"
echo "4. ⚙️  Configure service settings (see above)"
echo "5. 🔑 Add all environment variables (see above)"
echo "6. 🚀 Deploy!"
echo ""

print_info "💡 Tip: Test your deployment locally first:"
echo "   ./deploy-test.sh"
echo ""

print_info "📖 For detailed instructions, see:"
echo "   RENDER_DEPLOYMENT_GUIDE.md"
