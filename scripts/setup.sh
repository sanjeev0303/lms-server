#!/bin/bash

# ==============================================
# AWS LMS Server Setup Script
# ==============================================
# Initial server setup and configuration
# Usage: ./scripts/setup.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
PROJECT_DIR="/opt/aws-lms"
USER="aws-lms"
GROUP="aws-lms"

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
    echo "  AWS LMS Server Setup - $1"
    echo "=================================================="
    echo -e "${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Function to detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "Cannot detect operating system"
        exit 1
    fi

    print_status "Detected OS: $OS $VER"
}

# Function to update system packages
update_system() {
    print_header "Updating System Packages"

    case $OS in
        *"Ubuntu"*|*"Debian"*)
            apt-get update
            apt-get upgrade -y
            ;;
        *"CentOS"*|*"Red Hat"*|*"Amazon Linux"*)
            yum update -y
            ;;
        *)
            print_warning "Unknown OS, skipping system update"
            ;;
    esac

    print_status "System packages updated ✓"
}

# Function to install essential packages
install_packages() {
    print_header "Installing Essential Packages"

    case $OS in
        *"Ubuntu"*|*"Debian"*)
            apt-get install -y \
                curl \
                wget \
                git \
                unzip \
                nginx \
                postgresql-client \
                redis-tools \
                htop \
                nano \
                vim \
                jq \
                bc \
                net-tools \
                systemd \
                cron \
                logrotate \
                fail2ban \
                ufw \
                certbot \
                python3-certbot-nginx
            ;;
        *"CentOS"*|*"Red Hat"*|*"Amazon Linux"*)
            yum install -y \
                curl \
                wget \
                git \
                unzip \
                nginx \
                postgresql \
                redis \
                htop \
                nano \
                vim \
                jq \
                bc \
                net-tools \
                systemd \
                cronie \
                logrotate \
                fail2ban \
                firewalld \
                certbot \
                python3-certbot-nginx
            ;;
    esac

    print_status "Essential packages installed ✓"
}

# Function to install Docker
install_docker() {
    print_header "Installing Docker"

    # Check if Docker is already installed
    if command -v docker > /dev/null; then
        print_status "Docker is already installed"
        return 0
    fi

    # Install Docker based on OS
    case $OS in
        *"Ubuntu"*|*"Debian"*)
            # Add Docker's official GPG key
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -

            # Add Docker repository
            add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

            # Install Docker
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io
            ;;
        *"CentOS"*|*"Red Hat"*)
            # Install Docker from repository
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io
            ;;
        *"Amazon Linux"*)
            # Install Docker using Amazon Linux extras
            amazon-linux-extras install docker -y
            ;;
    esac

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    print_status "Docker installed and started ✓"
}

# Function to install Docker Compose
install_docker_compose() {
    print_header "Installing Docker Compose"

    # Check if Docker Compose is already installed
    if command -v docker-compose > /dev/null; then
        print_status "Docker Compose is already installed"
        return 0
    fi

    # Download and install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    # Create symlink for easier access
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

    print_status "Docker Compose installed ✓"
}

# Function to install Node.js
install_nodejs() {
    print_header "Installing Node.js"

    # Check if Node.js is already installed
    if command -v node > /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js is already installed: $NODE_VERSION"
        return 0
    fi

    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

    case $OS in
        *"Ubuntu"*|*"Debian"*)
            apt-get install -y nodejs
            ;;
        *"CentOS"*|*"Red Hat"*|*"Amazon Linux"*)
            yum install -y nodejs npm
            ;;
    esac

    # Install global packages
    npm install -g pm2

    print_status "Node.js installed ✓"
}

# Function to create system user
create_user() {
    print_header "Creating System User"

    # Create group if it doesn't exist
    if ! getent group $GROUP > /dev/null; then
        groupadd $GROUP
        print_status "Created group: $GROUP"
    fi

    # Create user if it doesn't exist
    if ! id $USER > /dev/null 2>&1; then
        useradd -r -g $GROUP -d $PROJECT_DIR -s /bin/bash $USER
        print_status "Created user: $USER"
    fi

    # Add user to docker group
    usermod -aG docker $USER

    print_status "System user configured ✓"
}

# Function to setup project directories
setup_directories() {
    print_header "Setting Up Project Directories"

    # Create project directories
    mkdir -p $PROJECT_DIR
    mkdir -p $PROJECT_DIR/logs
    mkdir -p $PROJECT_DIR/backups
    mkdir -p $PROJECT_DIR/uploads
    mkdir -p $PROJECT_DIR/ssl
    mkdir -p /var/log/aws-lms

    # Set ownership
    chown -R $USER:$GROUP $PROJECT_DIR
    chown -R $USER:$GROUP /var/log/aws-lms

    # Set permissions
    chmod 755 $PROJECT_DIR
    chmod 750 $PROJECT_DIR/logs
    chmod 750 $PROJECT_DIR/backups
    chmod 755 $PROJECT_DIR/uploads
    chmod 700 $PROJECT_DIR/ssl

    print_status "Project directories created ✓"
}

# Function to configure firewall
configure_firewall() {
    print_header "Configuring Firewall"

    case $OS in
        *"Ubuntu"*|*"Debian"*)
            # Configure UFW
            ufw --force reset
            ufw default deny incoming
            ufw default allow outgoing

            # Allow SSH
            ufw allow ssh

            # Allow HTTP/HTTPS
            ufw allow 80/tcp
            ufw allow 443/tcp

            # Allow application port (if not behind reverse proxy)
            if [ "$ENVIRONMENT" = "development" ]; then
                ufw allow 5000/tcp
            fi

            # Enable firewall
            ufw --force enable

            print_status "UFW firewall configured ✓"
            ;;
        *"CentOS"*|*"Red Hat"*|*"Amazon Linux"*)
            # Configure firewalld
            systemctl start firewalld
            systemctl enable firewalld

            # Allow services
            firewall-cmd --permanent --add-service=ssh
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https

            # Allow application port (if not behind reverse proxy)
            if [ "$ENVIRONMENT" = "development" ]; then
                firewall-cmd --permanent --add-port=5000/tcp
            fi

            # Reload firewall
            firewall-cmd --reload

            print_status "Firewalld configured ✓"
            ;;
    esac
}

# Function to configure fail2ban
configure_fail2ban() {
    print_header "Configuring Fail2ban"

    # Create jail.local configuration
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[ssh]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
port = http,https
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

    # Start and enable fail2ban
    systemctl start fail2ban
    systemctl enable fail2ban

    print_status "Fail2ban configured ✓"
}

# Function to configure Nginx
configure_nginx() {
    print_header "Configuring Nginx"

    # Create nginx configuration directory
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled

    # Copy nginx configuration from project
    if [ -f "$PROJECT_DIR/nginx/nginx.conf" ]; then
        cp "$PROJECT_DIR/nginx/nginx.conf" /etc/nginx/nginx.conf
    fi

    # Create default site configuration
    cat > /etc/nginx/sites-available/aws-lms << EOF
server {
    listen 80;
    server_name _;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    # SSL configuration (will be updated with actual certificates)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    # Proxy to application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:5000/health;
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/aws-lms /etc/nginx/sites-enabled/

    # Remove default site
    rm -f /etc/nginx/sites-enabled/default

    # Test configuration
    nginx -t

    # Start and enable nginx
    systemctl start nginx
    systemctl enable nginx

    print_status "Nginx configured ✓"
}

# Function to setup SSL certificates
setup_ssl() {
    print_header "Setting Up SSL Certificates"

    if [ "$ENVIRONMENT" = "production" ]; then
        print_status "Production SSL setup requires domain configuration"
        print_status "Run 'certbot --nginx' after configuring your domain"
    else
        print_status "Development environment - using self-signed certificates"
    fi

    print_status "SSL setup completed ✓"
}

# Function to configure logrotate
configure_logrotate() {
    print_header "Configuring Log Rotation"

    cat > /etc/logrotate.d/aws-lms << EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $GROUP
    postrotate
        systemctl reload nginx
    endscript
}

/var/log/aws-lms/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $GROUP
}
EOF

    print_status "Log rotation configured ✓"
}

# Function to setup cron jobs
setup_cron() {
    print_header "Setting Up Cron Jobs"

    # Create cron jobs for the aws-lms user
    cat > /tmp/aws-lms-cron << EOF
# Backup database daily at 2 AM
0 2 * * * $PROJECT_DIR/scripts/backup.sh database

# Health check every 5 minutes
*/5 * * * * $PROJECT_DIR/scripts/health-check.sh api > /dev/null 2>&1

# Log cleanup weekly
0 3 * * 0 $PROJECT_DIR/scripts/log-manager.sh cleanup

# System monitoring hourly
0 * * * * $PROJECT_DIR/scripts/monitor.sh system >> $PROJECT_DIR/logs/monitoring.log 2>&1
EOF

    # Install cron jobs for aws-lms user
    sudo -u $USER crontab /tmp/aws-lms-cron
    rm /tmp/aws-lms-cron

    print_status "Cron jobs configured ✓"
}

# Function to create systemd service
create_systemd_service() {
    print_header "Creating Systemd Service"

    cat > /etc/systemd/system/aws-lms.service << EOF
[Unit]
Description=AWS LMS Application
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=$USER
Group=$GROUP
WorkingDirectory=$PROJECT_DIR/server
Environment=NODE_ENV=$ENVIRONMENT
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up
ExecStop=/usr/bin/docker-compose -f docker-compose.prod.yml down
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$PROJECT_DIR

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    systemctl daemon-reload

    print_status "Systemd service created ✓"
}

# Function to perform security hardening
security_hardening() {
    print_header "Security Hardening"

    # Update SSH configuration
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

    # Configure SSH security
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
    echo "AllowUsers $USER" >> /etc/ssh/sshd_config

    # Restart SSH service
    systemctl restart sshd

    # Set secure file permissions
    chmod 700 /home/$USER/.ssh 2>/dev/null || true
    chmod 600 /home/$USER/.ssh/authorized_keys 2>/dev/null || true

    # Configure kernel parameters
    cat > /etc/sysctl.d/99-aws-lms-security.conf << EOF
# Network security
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0

# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Memory protection
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 1
EOF

    # Apply sysctl settings
    sysctl -p /etc/sysctl.d/99-aws-lms-security.conf

    print_status "Security hardening completed ✓"
}

# Function to make scripts executable
make_scripts_executable() {
    print_header "Making Scripts Executable"

    if [ -d "$PROJECT_DIR/scripts" ]; then
        chmod +x "$PROJECT_DIR"/scripts/*.sh
        chown $USER:$GROUP "$PROJECT_DIR"/scripts/*.sh
        print_status "Scripts made executable ✓"
    else
        print_warning "Scripts directory not found"
    fi
}

# Function to generate setup report
generate_report() {
    print_header "Setup Summary Report"

    echo "Environment: $ENVIRONMENT"
    echo "Project Directory: $PROJECT_DIR"
    echo "System User: $USER"
    echo "Date: $(date)"
    echo ""

    print_status "Installed Services:"
    echo "  ✓ Docker: $(docker --version 2>/dev/null || echo 'Not found')"
    echo "  ✓ Docker Compose: $(docker-compose --version 2>/dev/null || echo 'Not found')"
    echo "  ✓ Node.js: $(node --version 2>/dev/null || echo 'Not found')"
    echo "  ✓ Nginx: $(nginx -v 2>&1 | head -1 || echo 'Not found')"
    echo "  ✓ PostgreSQL Client: $(psql --version 2>/dev/null | head -1 || echo 'Not found')"
    echo ""

    print_status "Active Services:"
    systemctl is-active docker nginx fail2ban || true
    echo ""

    print_status "Firewall Status:"
    case $OS in
        *"Ubuntu"*|*"Debian"*)
            ufw status
            ;;
        *"CentOS"*|*"Red Hat"*|*"Amazon Linux"*)
            firewall-cmd --state
            ;;
    esac

    echo ""
    print_status "Next Steps:"
    echo "1. Deploy your application code to $PROJECT_DIR"
    echo "2. Configure environment variables"
    echo "3. Start the application service: systemctl start aws-lms"
    echo "4. Configure SSL certificates for production"
    echo "5. Set up monitoring and alerting"
}

# Main setup function
main() {
    print_header "Starting AWS LMS Server Setup"

    check_root
    detect_os
    update_system
    install_packages
    install_docker
    install_docker_compose
    install_nodejs
    create_user
    setup_directories
    configure_firewall
    configure_fail2ban
    configure_nginx
    setup_ssl
    configure_logrotate
    setup_cron
    create_systemd_service
    security_hardening
    make_scripts_executable

    print_header "Setup Completed Successfully"
    generate_report
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AWS LMS Server Setup Script"
    echo ""
    echo "Usage: $0 [environment]"
    echo ""
    echo "Environments:"
    echo "  development - Development environment (default)"
    echo "  staging     - Staging environment"
    echo "  production  - Production environment"
    echo ""
    echo "This script will:"
    echo "  • Update system packages"
    echo "  • Install Docker, Node.js, Nginx, PostgreSQL client"
    echo "  • Create system user and directories"
    echo "  • Configure firewall and security settings"
    echo "  • Set up SSL certificates and reverse proxy"
    echo "  • Create systemd service and cron jobs"
    echo "  • Apply security hardening"
    echo ""
    echo "Note: This script must be run as root"
    exit 0
fi

# Confirm if running in production
if [ "$ENVIRONMENT" = "production" ]; then
    print_warning "You are setting up a PRODUCTION environment!"
    echo -n "Are you sure? (y/N): "
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        print_status "Setup cancelled"
        exit 0
    fi
fi

# Run main setup
main
