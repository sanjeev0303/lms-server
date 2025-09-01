#!/bin/bash

# ==============================================
# AWS LMS Server Log Management Script
# ==============================================
# Usage: ./scripts/log-manager.sh [command] [options]
# Example: ./scripts/log-manager.sh monitor

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMMAND=${1:-help}
LOG_DIR="/opt/aws-lms/logs"
ARCHIVE_DIR="/opt/aws-lms/logs/archive"
MAX_LOG_SIZE="100M"
RETENTION_DAYS=30

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
    echo "  AWS LMS Log Manager - $1"
    echo "=================================================="
    echo -e "${NC}"
}

# Function to create log directories
create_directories() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$ARCHIVE_DIR"
    mkdir -p "$LOG_DIR/application"
    mkdir -p "$LOG_DIR/performance"
    mkdir -p "$LOG_DIR/security"
    mkdir -p "$LOG_DIR/audit"
    mkdir -p "$LOG_DIR/nginx"
    mkdir -p "$LOG_DIR/docker"
}

# Function to monitor logs in real-time
monitor_logs() {
    local log_type=${2:-all}

    print_header "Log Monitor - $log_type"

    case $log_type in
        "application"|"app")
            print_status "Monitoring application logs..."
            tail -f "$LOG_DIR"/application/*.log 2>/dev/null || echo "No application logs found"
            ;;
        "performance"|"perf")
            print_status "Monitoring performance logs..."
            tail -f "$LOG_DIR"/performance/*.log 2>/dev/null || echo "No performance logs found"
            ;;
        "security"|"sec")
            print_status "Monitoring security logs..."
            tail -f "$LOG_DIR"/security/*.log 2>/dev/null || echo "No security logs found"
            ;;
        "audit")
            print_status "Monitoring audit logs..."
            tail -f "$LOG_DIR"/audit/*.log 2>/dev/null || echo "No audit logs found"
            ;;
        "nginx")
            print_status "Monitoring Nginx logs..."
            tail -f /var/log/nginx/*.log "$LOG_DIR"/nginx/*.log 2>/dev/null || echo "No Nginx logs found"
            ;;
        "docker")
            print_status "Monitoring Docker logs..."
            docker-compose logs -f
            ;;
        "error"|"errors")
            print_status "Monitoring error logs..."
            tail -f "$LOG_DIR"/*/*.log | grep -i error --color=always
            ;;
        "all"|*)
            print_status "Monitoring all logs..."
            tail -f "$LOG_DIR"/*/*.log 2>/dev/null || echo "No logs found"
            ;;
    esac
}

# Function to analyze logs
analyze_logs() {
    local analysis_type=${2:-summary}
    local date_filter=${3:-today}

    print_header "Log Analysis - $analysis_type"

    # Set date filter
    case $date_filter in
        "today")
            DATE_PATTERN=$(date +%Y-%m-%d)
            ;;
        "yesterday")
            DATE_PATTERN=$(date -d "1 day ago" +%Y-%m-%d)
            ;;
        "week")
            DATE_PATTERN=$(date -d "7 days ago" +%Y-%m)
            ;;
        *)
            DATE_PATTERN="$date_filter"
            ;;
    esac

    case $analysis_type in
        "summary")
            analyze_summary "$DATE_PATTERN"
            ;;
        "errors")
            analyze_errors "$DATE_PATTERN"
            ;;
        "performance")
            analyze_performance "$DATE_PATTERN"
            ;;
        "security")
            analyze_security "$DATE_PATTERN"
            ;;
        "traffic")
            analyze_traffic "$DATE_PATTERN"
            ;;
        *)
            print_error "Unknown analysis type: $analysis_type"
            ;;
    esac
}

# Function to analyze log summary
analyze_summary() {
    local date_pattern=$1

    print_status "Log Summary for: $date_pattern"
    echo ""

    # Log file counts and sizes
    print_status "Log Files Summary:"
    for log_type in application performance security audit nginx; do
        if [ -d "$LOG_DIR/$log_type" ]; then
            local file_count=$(find "$LOG_DIR/$log_type" -name "*$date_pattern*" -type f | wc -l)
            local total_size=$(find "$LOG_DIR/$log_type" -name "*$date_pattern*" -type f -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1 || echo "0")

            if [ "$file_count" -gt 0 ]; then
                echo "  $log_type: $file_count files, $total_size"
            fi
        fi
    done

    echo ""

    # Recent log entries
    print_status "Recent Log Activity:"
    find "$LOG_DIR" -name "*$date_pattern*" -type f -exec tail -5 {} \; 2>/dev/null | head -20
}

# Function to analyze errors
analyze_errors() {
    local date_pattern=$1

    print_status "Error Analysis for: $date_pattern"
    echo ""

    # Count errors by type
    print_status "Error Counts:"
    find "$LOG_DIR" -name "*$date_pattern*" -type f -exec grep -l "ERROR\|error\|Error" {} \; 2>/dev/null | while read -r file; do
        local error_count=$(grep -c "ERROR\|error\|Error" "$file" 2>/dev/null || echo 0)
        if [ "$error_count" -gt 0 ]; then
            echo "  $(basename "$file"): $error_count errors"
        fi
    done

    echo ""

    # Show recent errors
    print_status "Recent Errors:"
    find "$LOG_DIR" -name "*$date_pattern*" -type f -exec grep -H "ERROR\|error\|Error" {} \; 2>/dev/null | tail -10
}

# Function to analyze performance
analyze_performance() {
    local date_pattern=$1

    print_status "Performance Analysis for: $date_pattern"
    echo ""

    # Response time analysis
    if [ -f "$LOG_DIR/performance/performance-$date_pattern.log" ]; then
        print_status "Average Response Times:"
        grep "responseTime" "$LOG_DIR/performance/performance-$date_pattern.log" | \
        awk -F'"responseTime":' '{print $2}' | \
        awk -F',' '{sum+=$1; count++} END {if(count>0) print "Average: " sum/count "ms, Total requests: " count}'

        echo ""

        # Slow requests
        print_status "Slow Requests (>1000ms):"
        grep "responseTime" "$LOG_DIR/performance/performance-$date_pattern.log" | \
        awk -F'"responseTime":' '{if($2+0 > 1000) print}' | \
        head -10
    else
        print_warning "No performance log found for $date_pattern"
    fi
}

# Function to analyze security
analyze_security() {
    local date_pattern=$1

    print_status "Security Analysis for: $date_pattern"
    echo ""

    if [ -f "$LOG_DIR/security/security-$date_pattern.log" ]; then
        # Failed login attempts
        print_status "Failed Login Attempts:"
        grep -c "failed.*login\|authentication.*failed" "$LOG_DIR/security/security-$date_pattern.log" 2>/dev/null || echo "0"

        # Suspicious IPs
        print_status "Suspicious Activity:"
        grep "suspicious\|threat\|blocked" "$LOG_DIR/security/security-$date_pattern.log" 2>/dev/null | head -10

        # Rate limit violations
        print_status "Rate Limit Violations:"
        grep -c "rate.*limit\|too.*many.*requests" "$LOG_DIR/security/security-$date_pattern.log" 2>/dev/null || echo "0"
    else
        print_warning "No security log found for $date_pattern"
    fi
}

# Function to analyze traffic
analyze_traffic() {
    local date_pattern=$1

    print_status "Traffic Analysis for: $date_pattern"
    echo ""

    # Nginx access logs
    if [ -f "/var/log/nginx/access.log" ]; then
        print_status "Request Counts by Hour:"
        grep "$date_pattern" /var/log/nginx/access.log | \
        awk '{print $4}' | \
        cut -d: -f2 | \
        sort | uniq -c | \
        sort -nr | head -10

        echo ""

        print_status "Top IP Addresses:"
        grep "$date_pattern" /var/log/nginx/access.log | \
        awk '{print $1}' | \
        sort | uniq -c | \
        sort -nr | head -10

        echo ""

        print_status "Top Requested URLs:"
        grep "$date_pattern" /var/log/nginx/access.log | \
        awk '{print $7}' | \
        sort | uniq -c | \
        sort -nr | head -10
    else
        print_warning "Nginx access log not found"
    fi
}

# Function to rotate logs
rotate_logs() {
    print_header "Log Rotation"

    create_directories

    print_status "Rotating application logs..."

    # Rotate each log type
    for log_type in application performance security audit; do
        if [ -d "$LOG_DIR/$log_type" ]; then
            print_status "Processing $log_type logs..."

            find "$LOG_DIR/$log_type" -name "*.log" -size +$MAX_LOG_SIZE | while read -r logfile; do
                if [ -f "$logfile" ]; then
                    local basename=$(basename "$logfile" .log)
                    local timestamp=$(date +%Y%m%d-%H%M%S)
                    local archived_file="$ARCHIVE_DIR/${basename}-${timestamp}.log.gz"

                    # Compress and move to archive
                    gzip -c "$logfile" > "$archived_file"

                    # Truncate original log
                    > "$logfile"

                    print_status "Rotated: $(basename "$logfile") -> $(basename "$archived_file")"
                fi
            done
        fi
    done

    # Rotate Docker logs
    print_status "Rotating Docker logs..."
    docker-compose exec app sh -c 'find /var/log -name "*.log" -size +100M -exec truncate -s 0 {} \;' 2>/dev/null || true

    print_status "Log rotation completed ✓"
}

# Function to cleanup old logs
cleanup_logs() {
    print_header "Log Cleanup"

    print_status "Cleaning up logs older than $RETENTION_DAYS days..."

    local deleted_count=0

    # Clean archived logs
    find "$ARCHIVE_DIR" -name "*.log.gz" -mtime +$RETENTION_DAYS | while read -r file; do
        rm "$file"
        print_status "Deleted: $(basename "$file")"
        deleted_count=$((deleted_count + 1))
    done

    # Clean old log files in log directories
    find "$LOG_DIR" -name "*.log.*" -mtime +$RETENTION_DAYS | while read -r file; do
        rm "$file"
        print_status "Deleted: $(basename "$file")"
        deleted_count=$((deleted_count + 1))
    done

    # Clean Docker logs
    print_status "Cleaning Docker logs..."
    docker system prune -f --filter "until=${RETENTION_DAYS}h" > /dev/null 2>&1 || true

    print_status "Cleanup completed: $deleted_count files removed"
}

# Function to search logs
search_logs() {
    local search_term=$2
    local log_type=${3:-all}
    local date_filter=${4:-today}

    if [ -z "$search_term" ]; then
        print_error "Please specify search term"
        echo "Usage: $0 search <term> [log_type] [date]"
        exit 1
    fi

    print_header "Log Search - '$search_term'"

    # Set date filter
    case $date_filter in
        "today")
            DATE_PATTERN=$(date +%Y-%m-%d)
            ;;
        "yesterday")
            DATE_PATTERN=$(date -d "1 day ago" +%Y-%m-%d)
            ;;
        "week")
            DATE_PATTERN=$(date -d "7 days ago" +%Y-%m)
            ;;
        *)
            DATE_PATTERN="$date_filter"
            ;;
    esac

    # Search in specified log type or all
    if [ "$log_type" = "all" ]; then
        find "$LOG_DIR" -name "*$DATE_PATTERN*" -type f -exec grep -l "$search_term" {} \; 2>/dev/null | while read -r file; do
            echo ""
            print_status "Found in: $(basename "$file")"
            grep -n --color=always "$search_term" "$file" | head -5
        done
    else
        if [ -d "$LOG_DIR/$log_type" ]; then
            find "$LOG_DIR/$log_type" -name "*$DATE_PATTERN*" -type f -exec grep -l "$search_term" {} \; 2>/dev/null | while read -r file; do
                echo ""
                print_status "Found in: $(basename "$file")"
                grep -n --color=always "$search_term" "$file" | head -5
            done
        else
            print_error "Log type not found: $log_type"
        fi
    fi
}

# Function to export logs
export_logs() {
    local export_type=${2:-all}
    local date_filter=${3:-today}
    local output_file=${4:-"logs-export-$(date +%Y%m%d-%H%M%S).tar.gz"}

    print_header "Log Export - $export_type"

    # Set date filter
    case $date_filter in
        "today")
            DATE_PATTERN=$(date +%Y-%m-%d)
            ;;
        "yesterday")
            DATE_PATTERN=$(date -d "1 day ago" +%Y-%m-%d)
            ;;
        "week")
            DATE_PATTERN=$(date -d "7 days ago" +%Y-%m)
            ;;
        *)
            DATE_PATTERN="$date_filter"
            ;;
    esac

    print_status "Exporting logs for: $DATE_PATTERN"

    # Create temporary directory for export
    local temp_dir=$(mktemp -d)

    # Copy logs based on type
    if [ "$export_type" = "all" ]; then
        find "$LOG_DIR" -name "*$DATE_PATTERN*" -type f -exec cp {} "$temp_dir/" \;
    else
        if [ -d "$LOG_DIR/$export_type" ]; then
            find "$LOG_DIR/$export_type" -name "*$DATE_PATTERN*" -type f -exec cp {} "$temp_dir/" \;
        else
            print_error "Log type not found: $export_type"
            rm -rf "$temp_dir"
            exit 1
        fi
    fi

    # Create archive
    if [ "$(ls -A "$temp_dir")" ]; then
        tar -czf "$output_file" -C "$temp_dir" .
        print_status "Logs exported to: $output_file"

        # Show export info
        local file_count=$(ls "$temp_dir" | wc -l)
        local archive_size=$(du -h "$output_file" | cut -f1)
        print_status "Files exported: $file_count"
        print_status "Archive size: $archive_size"
    else
        print_warning "No logs found for the specified criteria"
    fi

    # Cleanup
    rm -rf "$temp_dir"
}

# Function to show log status
show_status() {
    print_header "Log Status"

    # Directory info
    print_status "Log Directories:"
    for log_type in application performance security audit nginx; do
        if [ -d "$LOG_DIR/$log_type" ]; then
            local file_count=$(find "$LOG_DIR/$log_type" -name "*.log" -type f | wc -l)
            local total_size=$(du -sh "$LOG_DIR/$log_type" 2>/dev/null | cut -f1 || echo "0")
            echo "  $log_type: $file_count files, $total_size"
        fi
    done

    echo ""

    # Recent activity
    print_status "Recent Log Activity:"
    find "$LOG_DIR" -name "*.log" -type f -printf '%T@ %p\n' 2>/dev/null | \
    sort -rn | head -5 | while read -r timestamp file; do
        local date=$(date -d "@$timestamp" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "Unknown")
        echo "  $(basename "$file"): $date"
    done

    echo ""

    # Disk usage
    print_status "Disk Usage:"
    local total_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1 || echo "0")
    echo "  Total log size: $total_size"

    local archive_size=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1 || echo "0")
    echo "  Archive size: $archive_size"

    # Large log files
    print_status "Large Log Files (>10MB):"
    find "$LOG_DIR" -name "*.log" -size +10M -exec du -h {} \; 2>/dev/null | sort -rh | head -5
}

# Function to show help
show_help() {
    echo "AWS LMS Log Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  monitor [type]         - Monitor logs in real-time"
    echo "  analyze [type] [date]  - Analyze logs"
    echo "  search <term> [type] [date] - Search logs for specific term"
    echo "  rotate                 - Rotate large log files"
    echo "  cleanup                - Clean up old log files"
    echo "  export [type] [date] [file] - Export logs to archive"
    echo "  status                 - Show log status"
    echo "  help                   - Show this help"
    echo ""
    echo "Log Types:"
    echo "  all, application, performance, security, audit, nginx, docker"
    echo ""
    echo "Date Filters:"
    echo "  today, yesterday, week, YYYY-MM-DD"
    echo ""
    echo "Analysis Types:"
    echo "  summary, errors, performance, security, traffic"
    echo ""
    echo "Examples:"
    echo "  $0 monitor application"
    echo "  $0 analyze errors today"
    echo "  $0 search \"ERROR\" application today"
    echo "  $0 export security week logs-security-week.tar.gz"
    echo "  $0 rotate"
    echo "  $0 cleanup"
}

# Main function
main() {
    case $COMMAND in
        "monitor")
            monitor_logs "$@"
            ;;
        "analyze")
            analyze_logs "$@"
            ;;
        "search")
            search_logs "$@"
            ;;
        "rotate")
            rotate_logs
            ;;
        "cleanup")
            cleanup_logs
            ;;
        "export")
            export_logs "$@"
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function
main "$@"
