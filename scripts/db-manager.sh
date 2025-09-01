#!/bin/bash

# ==============================================
# AWS LMS Server Database Management Script
# ==============================================
# Usage: ./scripts/db-manager.sh [command] [options]
# Example: ./scripts/db-manager.sh migrate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMMAND=${1:-help}
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-lms_db}"
DB_USER="${DATABASE_USER:-postgres}"
BACKUP_DIR="/opt/aws-lms/backups/database"

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
    echo "  AWS LMS Database Manager - $1"
    echo "=================================================="
    echo -e "${NC}"
}

# Function to check if database is accessible
check_database() {
    if docker-compose exec -T postgres pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1; then
        return 0
    else
        print_error "Cannot connect to database"
        return 1
    fi
}

# Function to run Prisma migrations
run_migrations() {
    print_header "Running Database Migrations"

    print_status "Checking database connection..."
    if ! check_database; then
        print_error "Database is not accessible"
        exit 1
    fi

    print_status "Running Prisma migrations..."

    # Generate Prisma client
    npm run prisma:generate

    # Run migrations
    npm run prisma:deploy

    print_status "Migrations completed successfully ✓"
}

# Function to reset database
reset_database() {
    print_header "Resetting Database"

    print_warning "This will destroy all data in the database!"
    echo -n "Are you sure? (y/N): "
    read -r CONFIRM

    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        print_status "Database reset cancelled"
        exit 0
    fi

    print_status "Backing up current database..."
    ./scripts/backup.sh database

    print_status "Resetting database..."
    npm run prisma:reset -- --force

    print_status "Database reset completed ✓"
}

# Function to seed database
seed_database() {
    print_header "Seeding Database"

    print_status "Checking database connection..."
    if ! check_database; then
        print_error "Database is not accessible"
        exit 1
    fi

    print_status "Running database seeds..."

    if [ -f "prisma/seed.ts" ]; then
        npm run prisma:seed
        print_status "Database seeded successfully ✓"
    elif [ -f "sample-lectures.sql" ]; then
        print_status "Loading sample data from SQL file..."
        docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < sample-lectures.sql
        print_status "Sample data loaded successfully ✓"
    else
        print_warning "No seed file found (prisma/seed.ts or sample-lectures.sql)"
    fi
}

# Function to backup database
backup_database() {
    print_header "Backing Up Database"

    print_status "Creating database backup..."
    ./scripts/backup.sh database

    print_status "Database backup completed ✓"
}

# Function to restore database
restore_database() {
    local backup_file=$2

    print_header "Restoring Database"

    if [ -z "$backup_file" ]; then
        print_error "Please specify backup file"
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi

    print_warning "This will replace all current data with backup data!"
    echo -n "Are you sure? (y/N): "
    read -r CONFIRM

    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        print_status "Database restore cancelled"
        exit 0
    fi

    print_status "Creating backup of current database..."
    ./scripts/backup.sh database

    print_status "Restoring database from backup..."

    # Check if backup is encrypted
    if [[ "$backup_file" == *.enc ]]; then
        if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
            print_error "Backup is encrypted but BACKUP_ENCRYPTION_KEY is not set"
            exit 1
        fi

        # Decrypt and restore
        openssl enc -aes-256-cbc -d -in "$backup_file" -k "$BACKUP_ENCRYPTION_KEY" | \
        gunzip | \
        docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME"
    elif [[ "$backup_file" == *.gz ]]; then
        # Decompress and restore
        gunzip -c "$backup_file" | \
        docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME"
    else
        # Direct restore
        docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < "$backup_file"
    fi

    print_status "Database restored successfully ✓"
}

# Function to show database status
show_status() {
    print_header "Database Status"

    # Check connection
    if check_database; then
        print_status "Database is accessible ✓"
    else
        print_error "Database is not accessible ✗"
        return 1
    fi

    # Get database info
    print_status "Database Information:"

    # Database size
    DB_SIZE=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs || echo "Unknown")
    echo "  Size: $DB_SIZE"

    # Table count
    TABLE_COUNT=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
    echo "  Tables: $TABLE_COUNT"

    # Connection count
    CONNECTION_COUNT=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';" 2>/dev/null | xargs || echo "0")
    echo "  Active Connections: $CONNECTION_COUNT"

    # Migration status
    print_status "Migration Status:"
    npm run prisma:status || true

    # Recent backups
    print_status "Recent Backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR" | tail -5
    else
        echo "  No backup directory found"
    fi
}

# Function to optimize database
optimize_database() {
    print_header "Optimizing Database"

    print_status "Running database optimization..."

    # Analyze tables
    print_status "Analyzing tables..."
    docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;"

    # Vacuum tables
    print_status "Vacuuming tables..."
    docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "VACUUM;"

    # Reindex
    print_status "Reindexing database..."
    docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "REINDEX DATABASE \"$DB_NAME\";"

    print_status "Database optimization completed ✓"
}

# Function to show table information
show_tables() {
    print_header "Database Tables"

    if ! check_database; then
        exit 1
    fi

    print_status "Table Information:"

    # Get table sizes
    docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
            pg_stat_get_tuples_inserted(c.oid) AS inserts,
            pg_stat_get_tuples_updated(c.oid) AS updates,
            pg_stat_get_tuples_deleted(c.oid) AS deletes
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    "
}

# Function to create database user
create_user() {
    local username=$2
    local password=$3

    print_header "Creating Database User"

    if [ -z "$username" ] || [ -z "$password" ]; then
        print_error "Please specify username and password"
        echo "Usage: $0 create-user <username> <password>"
        exit 1
    fi

    print_status "Creating user: $username"

    docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE USER \"$username\" WITH PASSWORD '$password';
        GRANT CONNECT ON DATABASE \"$DB_NAME\" TO \"$username\";
        GRANT USAGE ON SCHEMA public TO \"$username\";
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"$username\";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO \"$username\";
    "

    print_status "User created successfully ✓"
}

# Function to drop database user
drop_user() {
    local username=$2

    print_header "Dropping Database User"

    if [ -z "$username" ]; then
        print_error "Please specify username"
        echo "Usage: $0 drop-user <username>"
        exit 1
    fi

    print_warning "This will permanently delete user: $username"
    echo -n "Are you sure? (y/N): "
    read -r CONFIRM

    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        print_status "User deletion cancelled"
        exit 0
    fi

    print_status "Dropping user: $username"

    docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DROP USER IF EXISTS \"$username\";"

    print_status "User dropped successfully ✓"
}

# Function to show help
show_help() {
    echo "AWS LMS Database Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  migrate       - Run database migrations"
    echo "  reset         - Reset database (destroys all data)"
    echo "  seed          - Seed database with sample data"
    echo "  backup        - Create database backup"
    echo "  restore       - Restore database from backup"
    echo "  status        - Show database status"
    echo "  optimize      - Optimize database performance"
    echo "  tables        - Show table information"
    echo "  create-user   - Create database user"
    echo "  drop-user     - Drop database user"
    echo "  help          - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 migrate"
    echo "  $0 backup"
    echo "  $0 restore /path/to/backup.sql.gz"
    echo "  $0 create-user newuser password123"
    echo "  $0 drop-user olduser"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_HOST     - Database host (default: localhost)"
    echo "  DATABASE_PORT     - Database port (default: 5432)"
    echo "  DATABASE_NAME     - Database name (default: lms_db)"
    echo "  DATABASE_USER     - Database user (default: postgres)"
}

# Main function
main() {
    case $COMMAND in
        "migrate")
            run_migrations
            ;;
        "reset")
            reset_database
            ;;
        "seed")
            seed_database
            ;;
        "backup")
            backup_database
            ;;
        "restore")
            restore_database "$@"
            ;;
        "status")
            show_status
            ;;
        "optimize")
            optimize_database
            ;;
        "tables")
            show_tables
            ;;
        "create-user")
            create_user "$@"
            ;;
        "drop-user")
            drop_user "$@"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function
main "$@"
