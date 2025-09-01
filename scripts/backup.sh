#!/bin/bash

# ==============================================
# AWS LMS Server Backup Script
# ==============================================
# Usage: ./scripts/backup.sh [type] [retention_days]
# Example: ./scripts/backup.sh full 30

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_TYPE=${1:-full}
RETENTION_DAYS=${2:-7}
BACKUP_DIR="/opt/aws-lms/backups"
LOG_DIR="/opt/aws-lms/logs"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

# Database configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-lms_db}"
DB_USER="${DATABASE_USER:-postgres}"

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
    echo "  AWS LMS Server Backup - $1"
    echo "=================================================="
    echo -e "${NC}"
}

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_DIR/backup.log"
}

# Function to create directories
create_directories() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/uploads"
    mkdir -p "$BACKUP_DIR/logs"
    mkdir -p "$BACKUP_DIR/config"
}

# Function to generate backup filename
get_backup_filename() {
    local type=$1
    local extension=$2
    echo "${type}-$(date +%Y%m%d-%H%M%S).${extension}"
}

# Function to backup database
backup_database() {
    print_status "Starting database backup..."

    local backup_file="$BACKUP_DIR/database/$(get_backup_filename "database" "sql")"
    local compressed_file="${backup_file}.gz"

    # Create database dump
    if docker-compose exec -T postgres pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME" > "$backup_file"; then
        print_status "Database dump created: $(basename "$backup_file")"

        # Compress the backup
        gzip "$backup_file"
        print_status "Database backup compressed: $(basename "$compressed_file")"

        # Get backup size
        local size=$(du -h "$compressed_file" | cut -f1)
        print_status "Database backup size: $size"

        # Encrypt if encryption key is provided
        if [ -n "$ENCRYPTION_KEY" ]; then
            openssl enc -aes-256-cbc -salt -in "$compressed_file" -out "${compressed_file}.enc" -k "$ENCRYPTION_KEY"
            rm "$compressed_file"
            print_status "Database backup encrypted"
            log_message "Database backup encrypted: $(basename "${compressed_file}.enc")"
        else
            log_message "Database backup created: $(basename "$compressed_file")"
        fi

        return 0
    else
        print_error "Database backup failed"
        log_message "Database backup failed"
        return 1
    fi
}

# Function to backup uploads
backup_uploads() {
    print_status "Starting uploads backup..."

    local backup_file="$BACKUP_DIR/uploads/$(get_backup_filename "uploads" "tar.gz")"
    local uploads_dir="public/uploads"

    if [ -d "$uploads_dir" ]; then
        # Create compressed archive
        tar -czf "$backup_file" -C public uploads/

        if [ $? -eq 0 ]; then
            local size=$(du -h "$backup_file" | cut -f1)
            local file_count=$(tar -tzf "$backup_file" | wc -l)

            print_status "Uploads backup created: $(basename "$backup_file")"
            print_status "Uploads backup size: $size"
            print_status "Files archived: $file_count"

            # Encrypt if encryption key is provided
            if [ -n "$ENCRYPTION_KEY" ]; then
                openssl enc -aes-256-cbc -salt -in "$backup_file" -out "${backup_file}.enc" -k "$ENCRYPTION_KEY"
                rm "$backup_file"
                print_status "Uploads backup encrypted"
                log_message "Uploads backup encrypted: $(basename "${backup_file}.enc")"
            else
                log_message "Uploads backup created: $(basename "$backup_file")"
            fi

            return 0
        else
            print_error "Uploads backup failed"
            log_message "Uploads backup failed"
            return 1
        fi
    else
        print_warning "Uploads directory not found: $uploads_dir"
        return 0
    fi
}

# Function to backup application logs
backup_logs() {
    print_status "Starting logs backup..."

    local backup_file="$BACKUP_DIR/logs/$(get_backup_filename "logs" "tar.gz")"
    local logs_dir="logs"

    if [ -d "$logs_dir" ]; then
        # Create compressed archive (exclude current backup log)
        tar -czf "$backup_file" --exclude="backup.log" -C . logs/

        if [ $? -eq 0 ]; then
            local size=$(du -h "$backup_file" | cut -f1)
            print_status "Logs backup created: $(basename "$backup_file")"
            print_status "Logs backup size: $size"
            log_message "Logs backup created: $(basename "$backup_file")"
            return 0
        else
            print_error "Logs backup failed"
            log_message "Logs backup failed"
            return 1
        fi
    else
        print_warning "Logs directory not found: $logs_dir"
        return 0
    fi
}

# Function to backup configuration files
backup_config() {
    print_status "Starting configuration backup..."

    local backup_file="$BACKUP_DIR/config/$(get_backup_filename "config" "tar.gz")"
    local config_files=(
        ".env"
        ".env.production"
        "docker-compose.yml"
        "docker-compose.prod.yml"
        "nginx/nginx.conf"
        "package.json"
        "prisma/schema.prisma"
    )

    # Create list of existing config files
    local existing_files=()
    for file in "${config_files[@]}"; do
        if [ -f "$file" ]; then
            existing_files+=("$file")
        fi
    done

    if [ ${#existing_files[@]} -gt 0 ]; then
        # Create compressed archive
        tar -czf "$backup_file" "${existing_files[@]}"

        if [ $? -eq 0 ]; then
            local size=$(du -h "$backup_file" | cut -f1)
            print_status "Configuration backup created: $(basename "$backup_file")"
            print_status "Configuration backup size: $size"
            print_status "Files backed up: ${#existing_files[@]}"
            log_message "Configuration backup created: $(basename "$backup_file")"
            return 0
        else
            print_error "Configuration backup failed"
            log_message "Configuration backup failed"
            return 1
        fi
    else
        print_warning "No configuration files found"
        return 0
    fi
}

# Function to upload to S3
upload_to_s3() {
    if [ -z "$S3_BUCKET" ]; then
        print_warning "S3_BACKUP_BUCKET not configured, skipping S3 upload"
        return 0
    fi

    print_status "Uploading backups to S3..."

    # Check if AWS CLI is available
    if ! command -v aws > /dev/null; then
        print_error "AWS CLI not found, cannot upload to S3"
        return 1
    fi

    # Upload all backup files
    local upload_count=0
    local total_size=0

    for backup_dir in "$BACKUP_DIR"/*; do
        if [ -d "$backup_dir" ]; then
            local dir_name=$(basename "$backup_dir")

            # Find today's backups
            find "$backup_dir" -name "*$(date +%Y%m%d)*" -type f | while read -r file; do
                local s3_key="backups/$dir_name/$(basename "$file")"

                if aws s3 cp "$file" "s3://$S3_BUCKET/$s3_key"; then
                    print_status "Uploaded: $(basename "$file")"
                    upload_count=$((upload_count + 1))

                    # Calculate size
                    local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
                    total_size=$((total_size + file_size))
                else
                    print_error "Failed to upload: $(basename "$file")"
                fi
            done
        fi
    done

    # Convert bytes to human readable
    local total_size_mb=$((total_size / 1024 / 1024))
    print_status "S3 upload completed: ${upload_count} files, ${total_size_mb}MB"
    log_message "S3 upload completed: ${upload_count} files, ${total_size_mb}MB"
}

# Function to cleanup old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups (retention: $RETENTION_DAYS days)..."

    local deleted_count=0

    # Clean local backups
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS | while read -r file; do
        rm "$file"
        print_status "Deleted old backup: $(basename "$file")"
        deleted_count=$((deleted_count + 1))
    done

    # Clean S3 backups if configured
    if [ -n "$S3_BUCKET" ] && command -v aws > /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)

        aws s3 ls "s3://$S3_BUCKET/backups/" --recursive | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_key=$(echo "$line" | awk '{print $4}')

            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$file_key"
                print_status "Deleted old S3 backup: $(basename "$file_key")"
            fi
        done
    fi

    print_status "Cleanup completed: $deleted_count local files removed"
    log_message "Cleanup completed: $deleted_count local files removed"
}

# Function to verify backups
verify_backups() {
    print_status "Verifying backups..."

    local verification_failed=0

    # Verify database backup
    local latest_db_backup=$(find "$BACKUP_DIR/database" -name "*$(date +%Y%m%d)*" -type f | head -1)
    if [ -n "$latest_db_backup" ]; then
        if [ -n "$ENCRYPTION_KEY" ]; then
            # Verify encrypted backup
            if openssl enc -aes-256-cbc -d -in "$latest_db_backup" -k "$ENCRYPTION_KEY" | gzip -t; then
                print_status "Database backup verification: PASSED"
            else
                print_error "Database backup verification: FAILED"
                verification_failed=1
            fi
        else
            # Verify compressed backup
            if gzip -t "$latest_db_backup"; then
                print_status "Database backup verification: PASSED"
            else
                print_error "Database backup verification: FAILED"
                verification_failed=1
            fi
        fi
    fi

    # Verify uploads backup
    local latest_uploads_backup=$(find "$BACKUP_DIR/uploads" -name "*$(date +%Y%m%d)*" -type f | head -1)
    if [ -n "$latest_uploads_backup" ]; then
        if [ -n "$ENCRYPTION_KEY" ] && [[ "$latest_uploads_backup" == *.enc ]]; then
            # Verify encrypted backup
            if openssl enc -aes-256-cbc -d -in "$latest_uploads_backup" -k "$ENCRYPTION_KEY" | tar -tz > /dev/null; then
                print_status "Uploads backup verification: PASSED"
            else
                print_error "Uploads backup verification: FAILED"
                verification_failed=1
            fi
        else
            # Verify tar.gz backup
            if tar -tzf "$latest_uploads_backup" > /dev/null; then
                print_status "Uploads backup verification: PASSED"
            else
                print_error "Uploads backup verification: FAILED"
                verification_failed=1
            fi
        fi
    fi

    return $verification_failed
}

# Function to generate backup report
generate_report() {
    print_header "Backup Summary Report"

    local total_size=0
    local file_count=0

    # Calculate backup statistics
    if [ -d "$BACKUP_DIR" ]; then
        # Get today's backups
        while IFS= read -r -d '' file; do
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
            total_size=$((total_size + size))
            file_count=$((file_count + 1))
        done < <(find "$BACKUP_DIR" -name "*$(date +%Y%m%d)*" -type f -print0)
    fi

    # Convert bytes to human readable
    local total_size_mb=$((total_size / 1024 / 1024))

    echo "Backup Type: $BACKUP_TYPE"
    echo "Date: $(date)"
    echo "Files Created: $file_count"
    echo "Total Size: ${total_size_mb}MB"
    echo "Retention: $RETENTION_DAYS days"
    echo "S3 Backup: $([ -n "$S3_BUCKET" ] && echo "Enabled" || echo "Disabled")"
    echo "Encryption: $([ -n "$ENCRYPTION_KEY" ] && echo "Enabled" || echo "Disabled")"

    log_message "Backup completed: $BACKUP_TYPE, $file_count files, ${total_size_mb}MB"
}

# Main backup function
main() {
    print_header "Starting $BACKUP_TYPE Backup"

    # Create necessary directories
    create_directories

    # Start backup log
    log_message "Starting $BACKUP_TYPE backup"

    local backup_success=0

    case $BACKUP_TYPE in
        "database"|"db")
            backup_database && backup_success=1
            ;;
        "uploads"|"files")
            backup_uploads && backup_success=1
            ;;
        "logs")
            backup_logs && backup_success=1
            ;;
        "config")
            backup_config && backup_success=1
            ;;
        "full"|*)
            if backup_database && backup_uploads && backup_logs && backup_config; then
                backup_success=1
            fi
            ;;
    esac

    if [ $backup_success -eq 1 ]; then
        print_status "Backup creation completed successfully"

        # Upload to S3 if configured
        upload_to_s3

        # Verify backups
        if verify_backups; then
            print_status "Backup verification completed successfully"
        else
            print_error "Backup verification failed"
        fi

        # Cleanup old backups
        cleanup_old_backups

        # Generate report
        echo ""
        generate_report

        print_header "Backup Process Completed Successfully"
        exit 0
    else
        print_error "Backup process failed"
        log_message "Backup process failed"
        exit 1
    fi
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [type] [retention_days]"
    echo ""
    echo "Backup Types:"
    echo "  full      - Complete backup (default)"
    echo "  database  - Database only"
    echo "  uploads   - Uploaded files only"
    echo "  logs      - Application logs only"
    echo "  config    - Configuration files only"
    echo ""
    echo "Options:"
    echo "  retention_days  - Number of days to keep backups (default: 7)"
    echo ""
    echo "Environment Variables:"
    echo "  S3_BACKUP_BUCKET      - S3 bucket for remote backups"
    echo "  BACKUP_ENCRYPTION_KEY - Encryption key for backup files"
    echo ""
    echo "Examples:"
    echo "  $0 full 30"
    echo "  $0 database 14"
    echo "  $0 uploads 7"
    exit 0
fi

# Run main backup function
main
