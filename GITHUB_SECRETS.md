# GitHub Actions Secrets Configuration

## Required Secrets for CI/CD Pipeline

The following secrets need to be configured in your GitHub repository settings before the CI/CD pipeline can run successfully.

### Security Scanning
- **`SNYK_TOKEN`** - Snyk API token for vulnerability scanning
  - Get from: https://snyk.io/account/
  - Used for: Dependency vulnerability scanning

### Deployment Secrets

#### Staging Environment
- **`STAGING_HOST`** - Staging server hostname or IP address
- **`STAGING_USER`** - SSH username for staging server
- **`STAGING_SSH_KEY`** - Private SSH key for staging server access
- **`STAGING_PORT`** - SSH port (usually 22)

#### Production Environment
- **`PRODUCTION_HOST`** - Production server hostname or IP address
- **`PRODUCTION_USER`** - SSH username for production server
- **`PRODUCTION_SSH_KEY`** - Private SSH key for production server access
- **`PRODUCTION_PORT`** - SSH port (usually 22)

### Notification Secrets
- **`SLACK_WEBHOOK_URL`** - Slack webhook URL for deployment notifications
  - Get from: Your Slack workspace settings > Incoming Webhooks

## How to Configure Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

## SSH Key Setup

### Generate SSH Key Pair
```bash
# Generate new SSH key pair
ssh-keygen -t rsa -b 4096 -C "github-actions@your-domain.com"

# Copy public key to servers
ssh-copy-id -i ~/.ssh/id_rsa.pub user@your-server
```

### Add Private Key to GitHub Secrets
- Copy the **private key** content to GitHub secrets (e.g., `PRODUCTION_SSH_KEY`)
- Ensure the **public key** is added to `~/.ssh/authorized_keys` on your servers

## Optional Secrets

### Database and External Services
- **`DATABASE_URL`** - Production database connection string
- **`REDIS_URL`** - Redis connection string
- **`AWS_ACCESS_KEY_ID`** - AWS access key for S3 backups
- **`AWS_SECRET_ACCESS_KEY`** - AWS secret key for S3 backups

## Security Best Practices

1. **Use separate keys** for staging and production
2. **Rotate secrets regularly** (every 90 days recommended)
3. **Use least privilege principle** for SSH users
4. **Monitor secret usage** in GitHub Actions logs
5. **Never commit secrets** to your repository

## Testing the Pipeline

Before setting up production secrets, you can:

1. **Test locally** with environment variables
2. **Use staging environment** first to validate the pipeline
3. **Run individual jobs** to test specific components

## Troubleshooting

### Common Issues
- **SSH connection failed**: Check host, user, and key configuration
- **Permission denied**: Ensure SSH key has correct permissions (600)
- **Host key verification failed**: Add server to known_hosts or disable strict checking for CI

### Debug Commands
```bash
# Test SSH connection
ssh -i ~/.ssh/private_key user@host

# Test Snyk token
snyk auth $SNYK_TOKEN

# Validate webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' $SLACK_WEBHOOK_URL
```

---

**Note**: The GitHub Actions warnings you're seeing are normal for template files and will resolve once you configure the required secrets in your repository.
