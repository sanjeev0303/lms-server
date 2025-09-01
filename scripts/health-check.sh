#!/bin/bash

# ==============================================
# AWS LMS Server Health Check Script
# ==============================================
# Usage: ./scripts/health-check.sh [service]
# Example: ./scripts/health-check.sh all

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:5000}"
NGINX_URL="${NGINX_URL:-http://localhost:80}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

SERVICE=${1:-all}
EXIT_CODE=0

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    EXIT_CODE=1
}

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "  AWS LMS Server Health Check - $1"
    echo "=================================================="
    echo -e "${NC}"
}

# Function to check API health
check_api() {
    print_header "API Health Check"

    # Check if API is responding
    if curl -f -s "$API_URL/health" > /dev/null; then
        print_status "API is responding"

        # Get detailed health info
        HEALTH_RESPONSE=$(curl -s "$API_URL/health" || echo '{}')
        echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
    else
        print_error "API is not responding at $API_URL/health"
    fi

    # Check API endpoints
    endpoints=(
        "/health"
        "/api/v1/health"
        "/api/v1/auth/health"
        "/api/v1/courses/health"
    )

    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$API_URL$endpoint" > /dev/null; then
            print_status "Endpoint $endpoint is responding"
        else
            print_warning "Endpoint $endpoint is not responding"
        fi
    done

    # Check response time
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$API_URL/health" || echo "0")
    RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc -l | cut -d. -f1)

    if [ "$RESPONSE_TIME_MS" -lt 1000 ]; then
        print_status "API response time: ${RESPONSE_TIME_MS}ms (Good)"
    elif [ "$RESPONSE_TIME_MS" -lt 3000 ]; then
        print_warning "API response time: ${RESPONSE_TIME_MS}ms (Acceptable)"
    else
        print_error "API response time: ${RESPONSE_TIME_MS}ms (Slow)"
    fi
}

# Function to check database health
check_database() {
    print_header "Database Health Check"

    # Check if PostgreSQL is running
    if pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT" > /dev/null 2>&1; then
        print_status "PostgreSQL is running"
    else
        print_error "PostgreSQL is not running or not accessible"
        return
    fi

    # Check database connection via Docker
    if docker-compose exec -T postgres psql -U postgres -d lms_db -c "SELECT 1;" > /dev/null 2>&1; then
        print_status "Database connection successful"
    else
        print_error "Cannot connect to database"
        return
    fi

    # Check database size
    DB_SIZE=$(docker-compose exec -T postgres psql -U postgres -d lms_db -t -c "SELECT pg_size_pretty(pg_database_size('lms_db'));" 2>/dev/null | xargs || echo "Unknown")
    print_status "Database size: $DB_SIZE"

    # Check table counts
    TABLES=$(docker-compose exec -T postgres psql -U postgres -d lms_db -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
    print_status "Number of tables: $TABLES"

    # Check active connections
    CONNECTIONS=$(docker-compose exec -T postgres psql -U postgres -d lms_db -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'lms_db';" 2>/dev/null | xargs || echo "0")
    print_status "Active connections: $CONNECTIONS"

    # Check for long-running queries
    LONG_QUERIES=$(docker-compose exec -T postgres psql -U postgres -d lms_db -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '1 minute';" 2>/dev/null | xargs || echo "0")
    if [ "$LONG_QUERIES" -eq 0 ]; then
        print_status "No long-running queries"
    else
        print_warning "Long-running queries detected: $LONG_QUERIES"
    fi
}

# Function to check Redis health
check_redis() {
    print_header "Redis Health Check"

    # Check if Redis is running
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
        print_status "Redis is running"
    else
        print_error "Redis is not running or not accessible"
        return
    fi

    # Check Redis info
    REDIS_INFO=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info server 2>/dev/null || echo "")
    if [ -n "$REDIS_INFO" ]; then
        REDIS_VERSION=$(echo "$REDIS_INFO" | grep "redis_version" | cut -d: -f2 | tr -d '\r')
        UPTIME=$(echo "$REDIS_INFO" | grep "uptime_in_seconds" | cut -d: -f2 | tr -d '\r')
        UPTIME_HOURS=$((UPTIME / 3600))

        print_status "Redis version: $REDIS_VERSION"
        print_status "Redis uptime: ${UPTIME_HOURS} hours"
    fi

    # Check memory usage
    MEMORY_INFO=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info memory 2>/dev/null || echo "")
    if [ -n "$MEMORY_INFO" ]; then
        USED_MEMORY=$(echo "$MEMORY_INFO" | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        print_status "Redis memory usage: $USED_MEMORY"
    fi

    # Check connected clients
    CLIENTS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info clients 2>/dev/null | grep "connected_clients" | cut -d: -f2 | tr -d '\r' || echo "0")
    print_status "Connected Redis clients: $CLIENTS"
}

# Function to check Docker services
check_docker() {
    print_header "Docker Services Health Check"

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running"
        return
    fi

    print_status "Docker is running"

    # Check Docker Compose services
    if [ -f "docker-compose.prod.yml" ]; then
        SERVICES=$(docker-compose -f docker-compose.prod.yml ps --services)

        for service in $SERVICES; do
            STATUS=$(docker-compose -f docker-compose.prod.yml ps -q "$service" | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null || echo "not found")

            if [ "$STATUS" = "running" ]; then
                print_status "Service $service is running"
            else
                print_error "Service $service is $STATUS"
            fi
        done
    fi

    # Check Docker system info
    DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "Unknown")
    print_status "Docker version: $DOCKER_VERSION"

    # Check disk usage
    DOCKER_DISK=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" 2>/dev/null || echo "Cannot get disk usage")
    echo "Docker disk usage:"
    echo "$DOCKER_DISK"
}

# Function to check system resources
check_system() {
    print_header "System Resources Health Check"

    # Check CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d',' -f1 || echo "0")
    if (( $(echo "$CPU_USAGE < 80" | bc -l) )); then
        print_status "CPU usage: ${CPU_USAGE}% (Normal)"
    else
        print_warning "CPU usage: ${CPU_USAGE}% (High)"
    fi

    # Check memory usage
    MEMORY_INFO=$(free -m)
    TOTAL_MEMORY=$(echo "$MEMORY_INFO" | awk 'NR==2{print $2}')
    USED_MEMORY=$(echo "$MEMORY_INFO" | awk 'NR==2{print $3}')
    MEMORY_PERCENT=$(echo "scale=1; $USED_MEMORY * 100 / $TOTAL_MEMORY" | bc)

    if (( $(echo "$MEMORY_PERCENT < 80" | bc -l) )); then
        print_status "Memory usage: ${MEMORY_PERCENT}% (${USED_MEMORY}MB/${TOTAL_MEMORY}MB)"
    else
        print_warning "Memory usage: ${MEMORY_PERCENT}% (${USED_MEMORY}MB/${TOTAL_MEMORY}MB)"
    fi

    # Check disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    if [ "$DISK_USAGE" -lt 80 ]; then
        print_status "Disk usage: ${DISK_USAGE}% (Normal)"
    else
        print_warning "Disk usage: ${DISK_USAGE}% (High)"
    fi

    # Check load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | cut -d',' -f1 | xargs)
    print_status "Load average: $LOAD_AVG"

    # Check available ports
    PORTS_IN_USE=$(netstat -tuln | grep -E ":80|:443|:5000|:5432|:6379" | wc -l)
    print_status "Critical ports in use: $PORTS_IN_USE"
}

# Function to check Nginx
check_nginx() {
    print_header "Nginx Health Check"

    # Check if Nginx is running
    if systemctl is-active --quiet nginx 2>/dev/null; then
        print_status "Nginx is running"
    elif pgrep nginx > /dev/null; then
        print_status "Nginx process is running"
    else
        print_error "Nginx is not running"
        return
    fi

    # Check Nginx configuration
    if nginx -t 2>/dev/null; then
        print_status "Nginx configuration is valid"
    else
        print_error "Nginx configuration has errors"
    fi

    # Check Nginx access
    if curl -f -s "$NGINX_URL" > /dev/null; then
        print_status "Nginx is accessible"
    else
        print_error "Cannot access Nginx at $NGINX_URL"
    fi

    # Check Nginx status
    if command -v systemctl > /dev/null; then
        NGINX_STATUS=$(systemctl show nginx --property=ActiveState --value 2>/dev/null || echo "unknown")
        print_status "Nginx status: $NGINX_STATUS"
    fi
}

# Function to generate health report
generate_report() {
    print_header "Health Check Summary"

    if [ $EXIT_CODE -eq 0 ]; then
        print_status "All health checks passed ✓"
    else
        print_error "Some health checks failed ✗"
    fi

    echo ""
    echo "Timestamp: $(date)"
    echo "Environment: ${NODE_ENV:-development}"
    echo "Exit Code: $EXIT_CODE"
}

# Main function
main() {
    case $SERVICE in
        "api")
            check_api
            ;;
        "database"|"db")
            check_database
            ;;
        "redis")
            check_redis
            ;;
        "docker")
            check_docker
            ;;
        "system")
            check_system
            ;;
        "nginx")
            check_nginx
            ;;
        "all"|*)
            check_api
            echo ""
            check_database
            echo ""
            check_redis
            echo ""
            check_docker
            echo ""
            check_system
            echo ""
            check_nginx
            ;;
    esac

    echo ""
    generate_report

    exit $EXIT_CODE
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [service]"
    echo ""
    echo "Services:"
    echo "  all       - Check all services (default)"
    echo "  api       - Check API health"
    echo "  database  - Check PostgreSQL database"
    echo "  redis     - Check Redis cache"
    echo "  docker    - Check Docker services"
    echo "  system    - Check system resources"
    echo "  nginx     - Check Nginx reverse proxy"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 api"
    echo "  $0 database"
    exit 0
fi

# Run main function
main
