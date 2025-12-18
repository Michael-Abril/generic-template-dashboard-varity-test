# Generic Template Dashboard - Quick Start Guide

## Development Mode (Default)

```bash
# Start all services with hot-reload
docker-compose up -d

# Access
Backend:   http://localhost:8002
API Docs:  http://localhost:8002/docs
Health:    http://localhost:8002/health

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

**Features:**
- ✅ Hot-reload enabled (code changes auto-reload)
- ✅ Volume mounts active (edit code live)
- ✅ Debug logging
- ✅ Single worker (simpler debugging)

---

## Production Mode

```bash
# Start all services with production settings
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose ps
docker-compose logs backend

# Stop
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

**Features:**
- ✅ 4 worker processes (better performance)
- ✅ No hot-reload (production stability)
- ✅ Code baked into image (immutable)
- ✅ Resource limits enforced
- ✅ Redis authentication required

---

## Key Differences

| Feature | Development | Production |
|---------|-------------|------------|
| Workers | 1 (single) | 4 (multi-process) |
| Hot-reload | ✅ Yes | ❌ No |
| Volume mounts | ✅ Yes | ❌ No (baked in) |
| Logging | Debug | Warning |
| Resource limits | None | CPU/Memory caps |
| Redis auth | Optional | Required |

---

## Environment Setup

### Development (.env)
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with development values
```

### Production (.env.prod)
```bash
cp backend/.env.example backend/.env.prod
# Edit backend/.env.prod with production values

# Required changes:
POSTGRES_PASSWORD=<SECURE_PASSWORD>
REDIS_PASSWORD=<SECURE_PASSWORD>
ENVIRONMENT=production
LOG_LEVEL=warning
OAUTH_REDIRECT_BASE_URL=https://yourdomain.com
```

---

## Common Commands

```bash
# Health checks
docker-compose ps                                    # All services
curl http://localhost:8002/health                    # Backend
docker-compose exec postgres pg_isready              # PostgreSQL
docker-compose exec redis redis-cli ping             # Redis

# Logs
docker-compose logs -f                               # All services
docker-compose logs -f backend                       # Backend only
docker-compose logs --tail=100 backend               # Last 100 lines

# Resource monitoring
docker stats                                         # Real-time stats

# Restart services
docker-compose restart backend                       # Backend only
docker-compose restart                               # All services

# Clean start
docker-compose down -v                               # Remove volumes
docker-compose up -d                                 # Fresh start
```

---

## Service Ports

| Service | Internal | External | Access |
|---------|----------|----------|--------|
| Backend | 8000 | 8002 | http://localhost:8002 |
| PostgreSQL | 5432 | 5433 | localhost:5433 |
| Redis | 6379 | 6380 | localhost:6380 |
| Ollama | 11434 | 11435 | http://localhost:11435 |
| Qdrant | 6333 | 6334 | http://localhost:6334 |

---

## Troubleshooting

**Backend won't start:**
```bash
docker-compose logs backend
docker-compose restart postgres redis
```

**Out of memory:**
```bash
docker stats  # Check which service
# Increase Docker memory limit to 16GB
# Or use smaller LLM model: OLLAMA_MODEL=tinyllama
```

**Port conflicts:**
```bash
# Change external ports in docker-compose.yml
# Example: "8003:8000" instead of "8002:8000"
```

---

## Next Steps

1. Read full deployment guide: `DEPLOYMENT.md`
2. See production summary: `PRODUCTION_DEPLOYMENT_SUMMARY.md`
3. Configure OAuth integrations in `.env`
4. Deploy to production server

---

**Support:** support@varity.xyz | **Docs:** https://docs.varity.xyz
