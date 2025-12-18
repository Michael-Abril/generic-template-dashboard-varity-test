# Generic Template Dashboard - Deployment Guide

## Overview

This guide covers deploying the Generic Template Dashboard in both development and production environments.

## Architecture

The stack consists of 5 containerized services:

1. **PostgreSQL** - Relational database for application data
2. **Redis** - Cache and Celery message broker
3. **Ollama** - Local LLM (Mistral/TinyLlama) for AI features
4. **Qdrant** - Vector database for RAG (Retrieval-Augmented Generation)
5. **Backend** - FastAPI application server

## Development Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum (16GB recommended for Ollama)
- 20GB disk space minimum

### Quick Start

```bash
# 1. Clone repository (if not already done)
cd /path/to/generic-company-dashboard

# 2. Copy environment template
cp backend/.env.example backend/.env

# 3. Edit environment variables
nano backend/.env
# Configure at minimum:
# - DATABASE_URL
# - REDIS_URL
# - VARITY_RPC_URL

# 4. Start all services
docker-compose up -d

# 5. Check service health
docker-compose ps
docker-compose logs backend

# 6. Access the application
# Backend API: http://localhost:8002
# API Docs: http://localhost:8002/docs
# Health Check: http://localhost:8002/health
```

### Development Features

The development configuration (default `docker-compose.yml`) includes:

- **Hot-reloading** - Backend automatically reloads on code changes
- **Volume mounts** - Code changes reflected immediately
- **Debug logging** - Verbose logs for troubleshooting
- **No resource limits** - Unrestricted CPU/memory for development

### Stopping Development Environment

```bash
# Stop all services (preserves data)
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

## Production Deployment

### Prerequisites

- All development prerequisites
- Production domain name
- SSL certificate (for HTTPS)
- Environment-specific secrets (passwords, API keys)
- Monitoring infrastructure (Prometheus, Grafana)

### Production Setup

#### 1. Create Production Environment File

```bash
# Create production environment file
cp backend/.env.example backend/.env.prod

# Edit with production values
nano backend/.env.prod
```

**Required Production Variables:**

```bash
# Database (use strong password!)
POSTGRES_PASSWORD=<SECURE_RANDOM_PASSWORD>
DATABASE_URL=postgresql+asyncpg://generic_template:${POSTGRES_PASSWORD}@generic-template-postgres:5432/generic_template

# Redis (enable authentication)
REDIS_PASSWORD=<SECURE_RANDOM_PASSWORD>
REDIS_URL=redis://:${REDIS_PASSWORD}@generic-template-redis:6379

# Application
ENVIRONMENT=production
DEV_MODE=false
LOG_LEVEL=warning

# Blockchain
VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
BLOCKCHAIN_RPC_URL=<YOUR_PRODUCTION_RPC>

# OAuth (production URLs)
OAUTH_REDIRECT_BASE_URL=https://yourdomain.com

# Security
SECRET_KEY=<SECURE_RANDOM_SECRET_KEY>
```

#### 2. Build Production Images

```bash
# Build production image (without --reload flag)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Verify image
docker images | grep generic-template-backend
```

#### 3. Deploy to Production

```bash
# Start with production overrides
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Monitor startup
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```

#### 4. Verify Production Deployment

```bash
# Check all services are healthy
docker-compose ps

# Test health endpoint
curl https://yourdomain.com/health

# Check resource usage
docker stats

# Verify logs
docker-compose logs --tail=100 backend
```

### Production Configuration Differences

The production override (`docker-compose.prod.yml`) makes these changes:

| Feature | Development | Production |
|---------|-------------|------------|
| **Backend Workers** | Single worker + reload | 4 workers (multi-process) |
| **Code Mounting** | Volume mount (`./backend:/app`) | Baked into image |
| **Logging** | Debug level | Warning level |
| **Resource Limits** | None | CPU/Memory limits enforced |
| **Restart Policy** | No | `unless-stopped` |
| **Health Checks** | 30s intervals | 15s intervals |
| **Redis Auth** | Optional | Required (password) |

### Production Performance Settings

The production Dockerfile uses these uvicorn settings:

```bash
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \           # Multi-process for better CPU utilization
  --log-level info        # Reduced logging overhead
```

**Worker Calculation:**
- Formula: `(2 x CPU cores) + 1`
- Default: 4 workers (assumes 1-2 CPU cores)
- Adjust in `backend/Dockerfile` based on your server specs

### Resource Requirements

**Minimum Production Specs:**

| Service | CPU | RAM | Disk |
|---------|-----|-----|------|
| PostgreSQL | 1 core | 2GB | 10GB |
| Redis | 0.5 core | 1GB | 5GB |
| Ollama (LLM) | 4 cores | 8GB | 20GB |
| Qdrant | 2 cores | 4GB | 10GB |
| Backend | 2 cores | 4GB | 5GB |
| **Total** | **9.5 cores** | **19GB** | **50GB** |

**Recommended Production Specs:**

| Component | Specification |
|-----------|---------------|
| CPU | 12+ cores |
| RAM | 32GB |
| Disk | 100GB SSD |
| Network | 1Gbps |

## Health Checks

All services include health checks:

### PostgreSQL
```bash
docker-compose exec postgres pg_isready -U generic_template
```

### Redis
```bash
docker-compose exec redis redis-cli ping
```

### Backend
```bash
curl http://localhost:8002/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-05T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ollama": "available",
    "qdrant": "connected"
  }
}
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Resource Usage

```bash
# Real-time resource monitoring
docker stats

# Service-specific stats
docker stats generic-template-backend
```

### Database Monitoring

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U generic_template

# Check connections
SELECT count(*) FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('generic_template'));
```

### Redis Monitoring

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check memory usage
INFO memory

# Check connected clients
CLIENT LIST
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U generic_template generic_template > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose exec -T postgres psql -U generic_template generic_template < backup_20251205.sql
```

### Volume Backup

```bash
# Backup all volumes
docker run --rm \
  -v generic-template-postgres-data:/source \
  -v $(pwd)/backups:/backup \
  alpine tar -czf /backup/postgres-$(date +%Y%m%d).tar.gz -C /source .

# Restore volume
docker run --rm \
  -v generic-template-postgres-data:/target \
  -v $(pwd)/backups:/backup \
  alpine tar -xzf /backup/postgres-20251205.tar.gz -C /target
```

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready - wait 30s after postgres starts
# 2. Missing environment variables - check .env file
# 3. Port conflict - check port 8002 is available
```

### Ollama Out of Memory

```bash
# Check Ollama logs
docker-compose logs ollama

# Solution: Increase Docker memory limit
# Docker Desktop -> Settings -> Resources -> Memory -> 16GB

# Or use smaller model
# Edit docker-compose.yml: OLLAMA_MODEL=tinyllama
```

### Database Connection Errors

```bash
# Verify postgres is healthy
docker-compose exec postgres pg_isready -U generic_template

# Check connection string
docker-compose exec backend env | grep DATABASE_URL

# Test connection
docker-compose exec backend python -c "from app.core.database import engine; print(engine.url)"
```

### High Memory Usage

```bash
# Check which service is using memory
docker stats

# Solutions:
# 1. Restart specific service: docker-compose restart <service>
# 2. Enable production resource limits (docker-compose.prod.yml)
# 3. Reduce Ollama model size
# 4. Clear Redis cache: docker-compose exec redis redis-cli FLUSHALL
```

## Scaling

### Horizontal Scaling (Multiple Backend Instances)

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Add load balancer (nginx example)
# See: docs/nginx-load-balancer.conf
```

### Vertical Scaling (More Resources)

Edit `docker-compose.prod.yml` resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '4.0'      # Increase from 2.0
          memory: 8G       # Increase from 4G
```

## Security Best Practices

### Production Checklist

- [ ] Use strong passwords (32+ characters, random)
- [ ] Enable Redis authentication
- [ ] Use HTTPS with valid SSL certificate
- [ ] Set `DEV_MODE=false`
- [ ] Restrict database access to backend only
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Enable audit logging
- [ ] Implement rate limiting
- [ ] Use secrets management (not .env files)

### Network Security

```yaml
# docker-compose.prod.yml additions
services:
  postgres:
    networks:
      generic-template-network:
        aliases:
          - database
    # Prevent external access
    ports: []  # Remove port mapping

  redis:
    networks:
      generic-template-network:
        aliases:
          - cache
    # Prevent external access
    ports: []  # Remove port mapping
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build production image
        run: |
          docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

      - name: Deploy to production
        run: |
          # SSH to production server
          ssh production "cd /app && docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
```

## Performance Tuning

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_integrations_company ON integrations(company_id);
CREATE INDEX idx_sync_status ON sync_jobs(status, created_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM integrations WHERE company_id = '...';
```

### Redis Optimization

```bash
# Increase max memory
docker-compose exec redis redis-cli CONFIG SET maxmemory 2gb

# Set eviction policy
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Backend Optimization

**Increase Worker Count:**

Edit `backend/Dockerfile`:

```dockerfile
# For 8-core server: (2 × 8) + 1 = 17 workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "17"]
```

**Enable Connection Pooling:**

Edit `backend/app/core/database.py`:

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,        # Increase from default 5
    max_overflow=40,     # Increase from default 10
    pool_pre_ping=True
)
```

## Support

For deployment issues:

- **GitHub Issues**: https://github.com/varity/generic-template/issues
- **Documentation**: https://docs.varity.xyz/deployment
- **Discord**: https://discord.gg/varity
- **Email**: support@varity.xyz

## Appendix: Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `VARITY_RPC_URL` | Varity L3 RPC endpoint | `https://rpc-varity-testnet-...` |
| `OLLAMA_URL` | Ollama API endpoint | `http://localhost:11434` |
| `QDRANT_URL` | Qdrant API endpoint | `http://localhost:6333` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment name | `development` |
| `DEV_MODE` | Enable development features | `false` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `SECRET_KEY` | JWT signing key | Auto-generated |
| `OLLAMA_MODEL` | LLM model name | `tinyllama` |

### OAuth Integration Variables

| Variable | Description |
|----------|-------------|
| `OAUTH_REDIRECT_BASE_URL` | Base URL for OAuth callbacks |
| `QUICKBOOKS_CLIENT_ID` | QuickBooks OAuth client ID |
| `QUICKBOOKS_CLIENT_SECRET` | QuickBooks OAuth secret |
| `SALESFORCE_CLIENT_ID` | Salesforce OAuth client ID |
| `SALESFORCE_CLIENT_SECRET` | Salesforce OAuth secret |
| ... | (Additional OAuth integrations) |

---

**Last Updated:** 2025-12-05
**Version:** 1.0.0
**Maintained By:** Varity Core Team
