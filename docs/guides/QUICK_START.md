# Quick Start Guide - Varity Generic Company Dashboard

**Ready in 3 commands!** 🚀

## Prerequisites
- Docker and Docker Compose installed
- Python 3.8+ installed
- Node.js 16+ installed (for frontend)

---

## 🚀 Start Infrastructure (1 minute)

```bash
# Navigate to project directory
cd /home/macoding/blokko-internal-os/varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard

# Start all Docker services
./start-infrastructure.sh

# Verify everything is running
./verify-infrastructure.sh
```

**Expected Output:**
```
✅ All critical services operational (2/2)
Ready for development! 🚀
```

---

## 📊 What's Running?

After running the start script, you have:

### ✅ PostgreSQL Database
- **Port**: 5432
- **Database**: varity
- **User**: varity
- **Password**: varity_secure_password_change_in_production
- **Tables**: 7 tables (oauth_credentials, integration_data, sync_jobs, etc.)

### ✅ Redis Cache
- **Port**: 6379
- **Features**: Persistence enabled (AOF mode)
- **Use Cases**: Session cache, Celery queue, rate limiting

### ✅ Ollama LLM (External)
- **Port**: 11434
- **Models**: codellama:13b-instruct, llama3.1:8b
- **Note**: Shared instance from another project

---

## 🔧 Backend Development

### 1. Setup Python Environment
```bash
cd backend

# Create virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Pinata credentials
nano .env
```

### 3. Start FastAPI Backend
```bash
# Development mode (auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Test Backend
```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs
```

---

## 🎨 Frontend Development

### 1. Install Dependencies
```bash
# From project root
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Access Dashboard
```
http://localhost:3000
```

---

## 🧪 Testing

### Infrastructure Test
```bash
cd backend
python3 test_infrastructure_simple.py
```

### Database Test
```bash
# Connect to PostgreSQL
docker exec -it varity-postgres psql -U varity -d varity

# List tables
\dt

# Query example
SELECT * FROM user_settings;

# Exit
\q
```

### Redis Test
```bash
# Connect to Redis
docker exec -it varity-redis redis-cli

# Test commands
ping
set test "hello"
get test

# Exit
exit
```

---

## 📝 Common Commands

### Infrastructure Management
```bash
# Start services
./start-infrastructure.sh

# Verify status
./verify-infrastructure.sh

# View logs
docker logs varity-postgres
docker logs varity-redis

# Stop services
docker-compose down

# Stop and remove data (fresh start)
docker-compose down -v
```

### Database Operations
```bash
# Execute SQL
docker exec varity-postgres psql -U varity -d varity -c "SELECT * FROM oauth_credentials;"

# Backup database
docker exec varity-postgres pg_dump -U varity varity > backup.sql

# Restore database
cat backup.sql | docker exec -i varity-postgres psql -U varity -d varity
```

### Redis Operations
```bash
# Test connection
docker exec varity-redis redis-cli ping

# Get all keys
docker exec varity-redis redis-cli keys '*'

# Clear all data
docker exec varity-redis redis-cli flushall
```

---

## 🔐 Environment Variables

Create `backend/.env` file:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://varity:varity_secure_password_change_in_production@localhost:5432/varity
REDIS_URL=redis://localhost:6379

# Ollama LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Pinata (Filecoin/IPFS Gateway)
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_KEY=your_secret_key_here
PINATA_JWT=your_jwt_token_here

# Varity L3 Blockchain
VARITY_CHAIN_ID=33529
VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz

# App Settings
DEBUG=true
LOG_LEVEL=INFO
```

---

## 📚 Project Structure

```
generic-company-dashboard/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── core/
│   │   │   ├── database.py    # Database utilities
│   │   │   └── config.py      # Configuration
│   │   ├── services/
│   │   │   ├── filecoin_service.py      # Filecoin integration
│   │   │   ├── encryption_service.py    # Lit Protocol
│   │   │   └── ollama_service.py        # LLM queries
│   │   └── api/
│   │       └── routes/        # API endpoints
│   ├── init-db.sql            # Database schema
│   ├── requirements.txt       # Python dependencies
│   └── test_infrastructure_simple.py
│
├── src/                       # Next.js frontend
│   ├── app/                   # App router
│   ├── components/            # React components
│   └── services/              # API clients
│
├── docker-compose.yml         # Docker services
├── start-infrastructure.sh    # Start script
├── verify-infrastructure.sh   # Verification script
└── package.json               # Frontend dependencies
```

---

## 🎯 Development Workflow

### Daily Workflow
```bash
# 1. Start infrastructure
./start-infrastructure.sh

# 2. Verify services
./verify-infrastructure.sh

# 3. Start backend (terminal 1)
cd backend && uvicorn main:app --reload

# 4. Start frontend (terminal 2)
npm run dev

# 5. Develop and test
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### End of Day
```bash
# Stop infrastructure
docker-compose down

# Or keep it running for tomorrow
# (uses minimal resources when idle)
```

---

## ⚠️ Troubleshooting

### PostgreSQL Won't Start
```bash
# Check logs
docker logs varity-postgres

# Restart container
docker restart varity-postgres

# Reset everything
docker-compose down -v
./start-infrastructure.sh
```

### Redis Connection Issues
```bash
# Check if running
docker ps | grep varity-redis

# Test connection
docker exec varity-redis redis-cli ping

# Restart
docker restart varity-redis
```

### Port Already in Use
```bash
# Find what's using port 5432
lsof -i :5432

# Or port 6379
lsof -i :6379

# Kill the process or change port in docker-compose.yml
```

### Fresh Start
```bash
# Nuclear option - reset everything
docker-compose down -v
docker system prune -af
./start-infrastructure.sh
```

---

## 🚀 Next Steps

1. **Read Documentation**
   - `INFRASTRUCTURE_STATUS.md` - Detailed infrastructure guide
   - `BACKEND_AGENT_COMPLETION_REPORT.md` - Setup completion report

2. **Configure Pinata**
   - Sign up at https://pinata.cloud
   - Get API keys
   - Add to `backend/.env`

3. **Build Features**
   - Implement OAuth integrations (Google Workspace, QuickBooks)
   - Build FastAPI endpoints
   - Connect Filecoin storage
   - Create RAG query system

4. **Test Everything**
   - Write unit tests
   - Test API endpoints
   - Verify data encryption
   - Load testing

---

## 💡 Pro Tips

1. **Keep Infrastructure Running**: Docker containers use minimal resources when idle
2. **Use API Docs**: FastAPI auto-generates docs at `/docs` endpoint
3. **Monitor Logs**: `docker logs -f varity-postgres` for live log streaming
4. **Backup Regularly**: Use `pg_dump` for database backups
5. **Test Locally First**: Verify everything works before deploying

---

## 📞 Support

- **Infrastructure Issues**: See `INFRASTRUCTURE_STATUS.md`
- **Database Schema**: See `backend/init-db.sql`
- **API Development**: See FastAPI docs at `/docs`
- **Testing**: Run `python3 test_infrastructure_simple.py`

---

## ✅ Verification Checklist

Before starting development, verify:

- [ ] Docker containers running (`docker ps`)
- [ ] PostgreSQL accessible (port 5432)
- [ ] Redis accessible (port 6379)
- [ ] Database has 7 tables (`\dt` in psql)
- [ ] Redis responds to PING
- [ ] Environment variables configured
- [ ] Python dependencies installed
- [ ] Node modules installed

**All checked?** You're ready to build! 🎉

---

**Last Updated**: 2025-11-14
**Status**: ✅ Production Ready
**Infrastructure**: PostgreSQL + Redis + Ollama
