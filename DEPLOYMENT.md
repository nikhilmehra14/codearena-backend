# Production Deployment Guide

This guide covers deploying the CodeArena Backend to production environments.

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Deployment Options](#deployment-options)
- [Security Best Practices](#security-best-practices)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

### ✅ Infrastructure Requirements
- [ ] PostgreSQL database instance (version 12+)
- [ ] Redis instance for caching
- [ ] Node.js runtime environment (version 16+)
- [ ] SSL certificate for HTTPS
- [ ] Domain name configured
- [ ] Firewall/Security groups configured

### ✅ API Keys & Credentials
- [ ] Clist.by API key obtained
- [ ] Firebase project created (for push notifications)
- [ ] Google OAuth credentials (if using Google login)
- [ ] GitHub OAuth credentials (if using GitHub login)

### ✅ Environment Variables
- [ ] All required variables set in `.env.production`
- [ ] Strong JWT secrets generated
- [ ] Production URLs configured
- [ ] CORS origins set correctly

---

## Environment Configuration

### 1. Create Production Environment File

```bash
# Copy the production template
cp .env.production.example .env.production
```

### 2. Configure Critical Variables

#### Generate Strong JWT Secrets
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Set Application URLs
```env
# Example for domain: api.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# If using subdomains for different apps:
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com,https://mobile.yourdomain.com
```

#### Configure OAuth Callbacks
Update OAuth provider settings to use production URLs:

**Google Cloud Console:**
- Authorized redirect URIs: `https://api.yourdomain.com/api/v1/auth/google/callback`

**GitHub OAuth Settings:**
- Authorization callback URL: `https://api.yourdomain.com/api/v1/auth/github/callback`

Then update `.env.production`:
```env
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback
GITHUB_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/github/callback
```

---

## Database Setup

### Option 1: Managed Database Services

#### AWS RDS (PostgreSQL)
```env
DATABASE_URL=postgresql://username:password@your-rds-instance.region.rds.amazonaws.com:5432/codearena?schema=public&sslmode=require
```

#### DigitalOcean Managed Database
```env
DATABASE_URL=postgresql://username:password@db-postgresql-region-12345.db.ondigitalocean.com:25060/codearena?sslmode=require
```

#### Google Cloud SQL
```env
DATABASE_URL=postgresql://username:password@/codearena?host=/cloudsql/project:region:instance&sslmode=require
```

### Option 2: Self-Hosted Database

If hosting your own PostgreSQL:
```env
DATABASE_URL=postgresql://username:password@your-db-host:5432/codearena?schema=public
```

### Run Migrations

After configuring the database:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify database connection
npx prisma db pull
```

---

## Deployment Options

### Option 1: Traditional VPS (DigitalOcean, Linode, AWS EC2)

#### 1. Install Dependencies
```bash
# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

#### 2. Clone & Setup
```bash
# Clone repository
git clone <your-repo-url>
cd codeArena-backend

# Install dependencies
npm install --production

# Setup environment
cp .env.production.example .env.production
# Edit .env.production with your values
nano .env.production
```

#### 3. Start with PM2
```bash
# Start application
pm2 start src/server.js --name codearena-backend -i max

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

#### 4. Setup Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

#### 1. Create Production Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/server.js"]
```

#### 2. Create docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: codearena
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 3. Deploy with Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

### Option 3: Platform-as-a-Service (Heroku, Railway, Render)

#### Railway.app
1. Create new project
2. Add PostgreSQL and Redis services
3. Connect GitHub repository
4. Set environment variables in Railway dashboard
5. Deploy automatically on push

#### Render.com
1. Create Web Service from GitHub repo
2. Set build command: `npm install && npx prisma generate`
3. Set start command: `node src/server.js`
4. Add PostgreSQL and Redis services
5. Configure environment variables

---

## Security Best Practices

### 1. Environment Variables
```bash
# NEVER commit these files to git
echo ".env" >> .gitignore
echo ".env.production" >> .gitignore
echo "*.local" >> .gitignore
```

### 2. SSL/TLS Configuration
- Always use HTTPS in production
- Use Let's Encrypt for free SSL certificates
- Configure HSTS headers

### 3. Database Security
```env
# Use SSL for database connections
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Restrict database access by IP
# Configure firewall to allow only application server
```

### 4. Rate Limiting
Adjust rate limits based on traffic:
```env
# More restrictive for production
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=50    # Reduce if under attack
```

### 5. CORS Configuration
```env
# Only allow specific domains
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

### 6. Logging
```env
# Use warn or error level in production
LOG_LEVEL=warn
```

---

## Monitoring & Maintenance

### 1. Application Monitoring

#### PM2 Monitoring
```bash
# View application status
pm2 status

# Monitor logs
pm2 logs codearena-backend

# Monitor CPU/Memory
pm2 monit
```

#### Setup Log Rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. Database Monitoring
```bash
# Check database size
SELECT pg_size_pretty(pg_database_size('codearena'));

# Monitor active connections
SELECT count(*) FROM pg_stat_activity;
```

### 3. Health Checks

Test application health:
```bash
# Health endpoint
curl https://api.yourdomain.com/health

# Database connectivity
curl https://api.yourdomain.com/health/db

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected"
}
```

### 4. Backup Strategy

#### Automated Database Backups
```bash
# Daily backup script
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres codearena > backup_${TIMESTAMP}.sql
gzip backup_${TIMESTAMP}.sql

# Upload to S3 or backup service
aws s3 cp backup_${TIMESTAMP}.sql.gz s3://your-backup-bucket/
```

### 5. Updates & Maintenance

#### Zero-Downtime Deployment
```bash
# Using PM2
git pull
npm install --production
npx prisma migrate deploy
pm2 reload codearena-backend
```

---

## Troubleshooting

### Issue: Database Connection Failed
```bash
# Check database is accessible
psql $DATABASE_URL

# Verify SSL mode
# If database doesn't support SSL: sslmode=disable
# If database requires SSL: sslmode=require
```

### Issue: Redis Connection Failed
```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

### Issue: OAuth Callbacks Not Working
- Verify callback URLs match OAuth provider settings exactly
- Check HTTPS is configured
- Ensure no trailing slashes in URLs

### Issue: CORS Errors
```env
# Add your frontend domain to CORS_ORIGIN
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

---

## Performance Optimization

### 1. Enable Compression
```javascript
// Already configured in server.js
const compression = require('compression');
app.use(compression());
```

### 2. Database Connection Pooling
```env
# Adjust based on server capacity
DB_POOL_MAX=20
DB_POOL_MIN=5
```

### 3. Redis Caching
```env
# Optimize cache TTL
CACHE_TTL=3600        # 1 hour
```

### 4. PM2 Cluster Mode
```bash
# Use all available CPU cores
pm2 start src/server.js -i max
```

---

## Support & Resources

- **Documentation**: Check other `.md` files in project
- **Issues**: Report bugs on GitHub
- **API Reference**: See `API_DOCUMENTATION.md`

---

**Last Updated**: January 2024
**Version**: 1.0
