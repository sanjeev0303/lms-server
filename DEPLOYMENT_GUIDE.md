# AWS LMS Server - Production Deployment Guide

## 🚀 Overview

This guide provides step-by-step instructions for deploying the AWS LMS Server to EC2 instances using Docker and Nginx for a serverless-like architecture with auto-scaling capabilities.

## 📋 Prerequisites

- AWS Account with EC2 access
- Domain name for SSL certificates
- Basic knowledge of Linux/Docker
- SSH key pair for EC2 instances

## 🏗️ Architecture Overview

```
Internet → ALB → EC2 Instances → Docker Containers → Database
                      ↓
              Auto Scaling Group
```

### Components:
- **Application Load Balancer (ALB)**: Routes traffic and provides SSL termination
- **Auto Scaling Group**: Automatically scales EC2 instances based on demand
- **EC2 Instances**: Run Dockerized Node.js application
- **RDS PostgreSQL**: Managed database service
- **ElastiCache Redis**: Managed caching layer
- **CloudWatch**: Monitoring and logging

## 🔧 Step 1: AWS Infrastructure Setup

### 1.1 Create VPC and Networking
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=lms-vpc}]'

# Create subnets (public and private in different AZs)
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.3.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.4.0/24 --availability-zone us-east-1b

# Create Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=lms-igw}]'
aws ec2 attach-internet-gateway --vpc-id vpc-xxx --internet-gateway-id igw-xxx
```

### 1.2 Create Security Groups
```bash
# ALB Security Group
aws ec2 create-security-group \
  --group-name lms-alb-sg \
  --description "Security group for LMS Application Load Balancer" \
  --vpc-id vpc-xxx

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# EC2 Security Group
aws ec2 create-security-group \
  --group-name lms-ec2-sg \
  --description "Security group for LMS EC2 instances" \
  --vpc-id vpc-xxx

aws ec2 authorize-security-group-ingress \
  --group-id sg-yyy \
  --protocol tcp \
  --port 22 \
  --cidr 10.0.0.0/16

aws ec2 authorize-security-group-ingress \
  --group-id sg-yyy \
  --protocol tcp \
  --port 5000 \
  --source-group sg-xxx
```

### 1.3 Create RDS PostgreSQL Database
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name lms-db-subnet-group \
  --db-subnet-group-description "Subnet group for LMS database" \
  --subnet-ids subnet-xxx subnet-yyy

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier lms-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-subnet-group-name lms-db-subnet-group \
  --vpc-security-group-ids sg-zzz \
  --backup-retention-period 7 \
  --storage-encrypted \
  --multi-az
```

### 1.4 Create ElastiCache Redis Cluster
```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name lms-cache-subnet-group \
  --cache-subnet-group-description "Subnet group for LMS cache" \
  --subnet-ids subnet-xxx subnet-yyy

# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id lms-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --cache-subnet-group-name lms-cache-subnet-group \
  --security-group-ids sg-zzz
```

## 🐳 Step 2: Prepare EC2 Instance

### 2.1 Launch EC2 Instance
```bash
# Create key pair
aws ec2 create-key-pair --key-name lms-key --query 'KeyMaterial' --output text > lms-key.pem
chmod 400 lms-key.pem

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1d0 \
  --instance-type t3.medium \
  --key-name lms-key \
  --security-group-ids sg-yyy \
  --subnet-id subnet-xxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=lms-server}]' \
  --user-data file://user-data.sh
```

### 2.2 User Data Script (user-data.sh)
```bash
#!/bin/bash
yum update -y
yum install -y docker

# Start Docker service
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install CloudWatch agent
yum install -y amazon-cloudwatch-agent

# Create application directory
mkdir -p /opt/aws-lms
cd /opt/aws-lms

# Clone repository (replace with your repo)
git clone https://github.com/your-username/aws-lms-deploy.git .

# Set proper permissions
chown -R ec2-user:ec2-user /opt/aws-lms
```

### 2.3 Connect and Setup Environment
```bash
# SSH to instance
ssh -i lms-key.pem ec2-user@your-instance-ip

# Navigate to project directory
cd /opt/aws-lms/server

# Create environment file
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:YourPassword@your-rds-endpoint:5432/lms_db
REDIS_URL=redis://your-elasticache-endpoint:6379
JWT_SECRET=your-super-secure-jwt-secret-here
CLERK_SECRET_KEY=your-clerk-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
EOF
```

## 🔥 Step 3: Deploy Application

### 3.1 Build and Start Services
```bash
# Build and start the application
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose exec app npm run prisma:deploy

# Verify services are running
docker-compose ps
docker-compose logs app
```

### 3.2 Production Docker Compose (docker-compose.prod.yml)
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: aws-lms-server
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - ./public/uploads:/app/public/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: aws-lms-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
```

## ⚖️ Step 4: Setup Load Balancer

### 4.1 Create Application Load Balancer
```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name lms-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --tags Key=Name,Value=lms-alb

# Create target group
aws elbv2 create-target-group \
  --name lms-targets \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-xxx \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Register targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/lms-targets/xxx \
  --targets Id=i-xxx,Port=80

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:region:account:loadbalancer/app/lms-alb/xxx \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/lms-targets/xxx
```

### 4.2 Setup SSL Certificate
```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names www.yourdomain.com \
  --validation-method DNS

# Add HTTPS listener (after certificate is validated)
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:region:account:loadbalancer/app/lms-alb/xxx \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:region:account:certificate/xxx \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/lms-targets/xxx
```

## 📈 Step 5: Auto Scaling Setup

### 5.1 Create Launch Template
```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name lms-launch-template \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1d0",
    "InstanceType": "t3.medium",
    "KeyName": "lms-key",
    "SecurityGroupIds": ["sg-yyy"],
    "UserData": "'$(base64 -w 0 user-data.sh)'",
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "Name", "Value": "lms-auto-instance"}]
    }]
  }'
```

### 5.2 Create Auto Scaling Group
```bash
# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name lms-asg \
  --launch-template LaunchTemplateName=lms-launch-template,Version='$Latest' \
  --min-size 1 \
  --max-size 5 \
  --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:region:account:targetgroup/lms-targets/xxx \
  --vpc-zone-identifier "subnet-xxx,subnet-yyy" \
  --health-check-type ELB \
  --health-check-grace-period 300

# Create scaling policies
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name lms-asg \
  --policy-name lms-scale-up \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    }
  }'
```

## 📊 Step 6: Monitoring and Logging

### 6.1 CloudWatch Setup
```bash
# Create log group
aws logs create-log-group --log-group-name /aws/ec2/lms-server

# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name LMS-Server-Dashboard \
  --dashboard-body file://dashboard.json
```

### 6.2 CloudWatch Agent Configuration
```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/aws-lms/server/logs/combined-*.log",
            "log_group_name": "/aws/ec2/lms-server",
            "log_stream_name": "{instance_id}/application",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          },
          {
            "file_path": "/opt/aws-lms/server/logs/error-*.log",
            "log_group_name": "/aws/ec2/lms-server",
            "log_stream_name": "{instance_id}/error",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "LMS/Application",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["used_percent"],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      }
    }
  }
}
```

## 🔄 Step 7: CI/CD Integration

### 7.1 GitHub Secrets Configuration
Add these secrets to your GitHub repository:

```bash
# Production Environment Secrets
PRODUCTION_HOST=your-alb-dns-name
PRODUCTION_USER=ec2-user
PRODUCTION_SSH_KEY=your-private-key-content
PRODUCTION_PORT=22

# Staging Environment Secrets
STAGING_HOST=your-staging-host
STAGING_USER=ec2-user
STAGING_SSH_KEY=your-private-key-content
STAGING_PORT=22

# Notification
SLACK_WEBHOOK_URL=your-slack-webhook-url

# Security
SNYK_TOKEN=your-snyk-token
```

### 7.2 Deployment Script
```bash
#!/bin/bash
# deploy.sh - Production deployment script

set -e

echo "🚀 Starting deployment..."

# Pull latest changes
cd /opt/aws-lms
git pull origin main

# Navigate to server directory
cd server

# Pull latest Docker image
docker-compose -f docker-compose.prod.yml pull app

# Run database migrations
docker-compose -f docker-compose.prod.yml run --rm app npm run prisma:deploy

# Deploy with rolling update
docker-compose -f docker-compose.prod.yml up -d app

# Health check
echo "⏳ Waiting for application to start..."
sleep 30

for i in {1..10}; do
  if curl -f http://localhost:5000/health; then
    echo "✅ Deployment successful!"
    exit 0
  fi
  echo "Health check attempt $i failed, retrying..."
  sleep 10
done

echo "❌ Health check failed!"
exit 1
```

## 🛡️ Step 8: Security Hardening

### 8.1 SSL/TLS Configuration
```bash
# Generate SSL certificates (if not using ACM)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 8.2 Firewall Configuration
```bash
# Configure UFW (if using Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 8.3 Security Updates
```bash
# Create auto-update script
cat > /etc/cron.daily/security-updates << EOF
#!/bin/bash
yum update -y --security
docker system prune -f
EOF

chmod +x /etc/cron.daily/security-updates
```

## 🔍 Step 9: Monitoring and Alerts

### 9.1 CloudWatch Alarms
```bash
# CPU Utilization Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "LMS-High-CPU" \
  --alarm-description "Alarm when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Application Error Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "LMS-Application-Errors" \
  --alarm-description "Alarm when error rate is high" \
  --metric-name 4XXError \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## 🚨 Troubleshooting

### Common Issues and Solutions

1. **Application Won't Start**
   ```bash
   # Check logs
   docker-compose logs app

   # Check environment variables
   docker-compose exec app env

   # Restart services
   docker-compose restart app
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   docker-compose exec app npm run prisma:studio

   # Check RDS security groups
   aws ec2 describe-security-groups --group-ids sg-xxx
   ```

3. **Load Balancer Health Checks Failing**
   ```bash
   # Check target health
   aws elbv2 describe-target-health --target-group-arn arn:xxx

   # Test local health endpoint
   curl -f http://localhost:5000/health
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   aws acm describe-certificate --certificate-arn arn:xxx

   # Test SSL
   openssl s_client -connect yourdomain.com:443
   ```

## 📝 Maintenance

### Regular Maintenance Tasks

1. **Weekly Tasks**
   - Review CloudWatch metrics and logs
   - Check for security updates
   - Verify backup integrity

2. **Monthly Tasks**
   - Review and optimize costs
   - Update dependencies
   - Review security group rules

3. **Quarterly Tasks**
   - Conduct security audit
   - Review scaling policies
   - Update documentation

## 🎯 Performance Optimization

### Application Level
- Enable compression (already configured)
- Implement caching with Redis
- Optimize database queries
- Use CDN for static assets

### Infrastructure Level
- Use appropriate instance types
- Configure auto-scaling policies
- Implement read replicas for database
- Use CloudFront for global distribution

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review CloudWatch logs
3. Contact the development team
4. Create an issue in the GitHub repository

---

**🎉 Congratulations!** Your AWS LMS Server is now deployed and ready for production use!
