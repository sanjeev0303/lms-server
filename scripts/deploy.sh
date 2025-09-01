#!/bin/bash

# ==============================================
# AWS LMS Server Deployment Script
# ==============================================
# Usage: ./scripts/deploy.sh [environment]
# Example: ./scripts/deploy.sh production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-staging}
PROJECT_DIR="/opt/aws-lms"
BACKUP_DIR="/opt/aws-lms/backups"
LOG_FILE="/opt/aws-lms/logs/deployment.log"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "  AWS LMS Server Deployment - $1"
    echo "=================================================="
    echo -e "${NC}"
}

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    if ! command_exists docker; then
        print_error "Docker is not installed"
        exit 1
    fi

    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed"
        exit 1
    fi

    if ! command_exists git; then
        print_error "Git is not installed"
        exit 1
    fi

    print_status "Prerequisites check completed ✓"
}

# Function to create backup
create_backup() {
    print_status "Creating backup..."

    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

    # Create database backup
    docker-compose exec -T postgres pg_dump -U postgres lms_db > "$BACKUP_PATH-db.sql"

    # Create uploads backup
    tar -czf "$BACKUP_PATH-uploads.tar.gz" -C public uploads/

    # Keep only last 5 backups
    ls -t "$BACKUP_DIR"/backup-*-db.sql | tail -n +6 | xargs -r rm
    ls -t "$BACKUP_DIR"/backup-*-uploads.tar.gz | tail -n +6 | xargs -r rm

    print_status "Backup created: $BACKUP_NAME ✓"
    log_message "Backup created: $BACKUP_NAME"
}

# Function to update source code
update_code() {
    print_status "Updating source code..."

    cd "$PROJECT_DIR"

    # Fetch latest changes
    git fetch origin

    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

    # Determine target branch based on environment
    case $ENVIRONMENT in
        production)
            TARGET_BRANCH="main"
            ;;
        staging)
            TARGET_BRANCH="staging"
            ;;
        development)
            TARGET_BRANCH="develop"
            ;;
        *)
            TARGET_BRANCH="main"
            ;;
    esac

    print_status "Switching to branch: $TARGET_BRANCH"
    git checkout "$TARGET_BRANCH"
    git pull origin "$TARGET_BRANCH"

    # Get commit info
    COMMIT_HASH=$(git rev-parse --short HEAD)
    COMMIT_MESSAGE=$(git log -1 --pretty=%B)

    print_status "Updated to commit: $COMMIT_HASH ✓"
    log_message "Updated to commit: $COMMIT_HASH - $COMMIT_MESSAGE"
}

# Function to build application
build_application() {
    print_status "Building application..."

    cd "$PROJECT_DIR/server"

    # Pull latest images
    docker-compose -f docker-compose.prod.yml pull

    # Build application
    docker-compose -f docker-compose.prod.yml build app

    print_status "Application built successfully ✓"
    log_message "Application built successfully"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."

    cd "$PROJECT_DIR/server"

    # Run migrations
    docker-compose -f docker-compose.prod.yml run --rm app npm run prisma:deploy

    print_status "Database migrations completed ✓"
    log_message "Database migrations completed"
}

# Function to deploy application
deploy_application() {
    print_status "Deploying application..."

    cd "$PROJECT_DIR/server"

    # Start services with rolling update
    docker-compose -f docker-compose.prod.yml up -d app

    print_status "Application deployed ✓"
    log_message "Application deployed"
}

# Function to run health check
health_check() {
    print_status "Running health check..."

    # Wait for application to start
    sleep 30

    # Perform health check
    MAX_ATTEMPTS=10
    ATTEMPT=1

    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if curl -f -s http://localhost:5000/health > /dev/null; then
            print_status "Health check passed ✓"
            log_message "Health check passed"
            return 0
        fi

        print_warning "Health check attempt $ATTEMPT failed, retrying..."
        sleep 10
        ATTEMPT=$((ATTEMPT + 1))
    done

    print_error "Health check failed after $MAX_ATTEMPTS attempts"
    log_message "Health check failed after $MAX_ATTEMPTS attempts"
    return 1
}

# Function to rollback deployment
rollback() {
    print_error "Rolling back deployment..."

    cd "$PROJECT_DIR/server"

    # Stop current deployment
    docker-compose -f docker-compose.prod.yml down app

    # Restore from backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*-db.sql | head -n 1)
    if [ -f "$LATEST_BACKUP" ]; then
        print_status "Restoring database from backup..."
        docker-compose exec -T postgres psql -U postgres -d lms_db < "$LATEST_BACKUP"
    fi

    # Restore uploads
    LATEST_UPLOADS_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*-uploads.tar.gz | head -n 1)
    if [ -f "$LATEST_UPLOADS_BACKUP" ]; then
        print_status "Restoring uploads from backup..."
        tar -xzf "$LATEST_UPLOADS_BACKUP" -C public/
    fi

    # Start previous version
    docker-compose -f docker-compose.prod.yml up -d app

    print_error "Rollback completed"
    log_message "Rollback completed"
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2

    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi

    # Log notification
    log_message "Notification sent: $status - $message"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."

    cd "$PROJECT_DIR/server"

    # Remove unused Docker images
    docker image prune -f

    # Remove unused volumes
    docker volume prune -f

    print_status "Cleanup completed ✓"
}

# Main deployment function
main() {
    print_header "Starting Deployment to $ENVIRONMENT"

    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"

    # Start deployment log
    log_message "Starting deployment to $ENVIRONMENT"

    # Run deployment steps
    if check_prerequisites && \
       create_backup && \
       update_code && \
       build_application && \
       run_migrations && \
       deploy_application && \
       health_check; then

        print_header "Deployment Successful"
        cleanup
        send_notification "SUCCESS" "Deployment to $ENVIRONMENT completed successfully"
        log_message "Deployment completed successfully"
        exit 0
    else
        print_header "Deployment Failed"
        rollback
        send_notification "FAILED" "Deployment to $ENVIRONMENT failed and was rolled back"
        log_message "Deployment failed and was rolled back"
        exit 1
    fi
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 [environment]"
    echo "Environments: development, staging, production"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production"
    exit 1
fi

# Confirm production deployment
if [ "$ENVIRONMENT" = "production" ]; then
    print_warning "You are about to deploy to PRODUCTION!"
    echo -n "Are you sure? (y/N): "
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        print_status "Deployment cancelled"
        exit 0
    fi
fi

# Run main deployment
main
