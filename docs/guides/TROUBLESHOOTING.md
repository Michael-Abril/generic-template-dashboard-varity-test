# Troubleshooting Guide - Generic Company Dashboard

This guide provides solutions to common issues you may encounter when deploying and running the Varity Generic Company Dashboard.

## Table of Contents

1. [Infrastructure Issues](#infrastructure-issues)
2. [Backend Issues](#backend-issues)
3. [Frontend Issues](#frontend-issues)
4. [Smart Contract Issues](#smart-contract-issues)
5. [Integration Issues](#integration-issues)
6. [Performance Issues](#performance-issues)

---

## Infrastructure Issues

### Docker Containers Not Starting

**Problem**: `docker-compose up` fails or containers exit immediately

**Solutions**:

1. **Check Docker daemon is running**
   ```bash
   docker ps
   # If error, start Docker Desktop/daemon
   ```

2. **Check port conflicts**
   ```bash
   # PostgreSQL port 5432
   lsof -i :5432
   # Redis port 6379
   lsof -i :6379
   ```

3. **Remove old containers and volumes**
   ```bash
   cd backend
   docker-compose down -v
   docker-compose up -d
   ```

4. **Check Docker logs**
   ```bash
   docker-compose logs postgres
   docker-compose logs redis
   ```

### PostgreSQL Connection Refused

**Problem**: `psycopg2.OperationalError: could not connect to server`

**Solutions**:

1. **Verify PostgreSQL is running**
   ```bash
   docker ps | grep varity-postgres
   ```

2. **Check database credentials**
   ```bash
   # In backend/.env
   DATABASE_URL=postgresql://varity:password@localhost:5432/varity
   ```

3. **Test connection manually**
   ```bash
   docker exec -it varity-postgres psql -U varity -d varity
   ```

4. **Recreate database**
   ```bash
   docker exec varity-postgres psql -U varity -c "DROP DATABASE varity;"
   docker exec varity-postgres psql -U varity -c "CREATE DATABASE varity;"
   cd backend && alembic upgrade head
   ```

### Redis Connection Issues

**Problem**: `redis.exceptions.ConnectionError`

**Solutions**:

1. **Verify Redis is running**
   ```bash
   docker ps | grep varity-redis
   ```

2. **Test Redis connection**
   ```bash
   docker exec -it varity-redis redis-cli ping
   # Should return: PONG
   ```

3. **Check Redis URL**
   ```bash
   # In backend/.env
   REDIS_URL=redis://localhost:6379/0
   ```

### Ollama Not Responding

**Problem**: `ConnectionError: Failed to connect to Ollama`

**Solutions**:

1. **Check Ollama is installed**
   ```bash
   ollama --version
   ```

2. **Start Ollama service**
   ```bash
   # Linux/Mac
   ollama serve

   # Or use setup script
   ./setup-ollama.sh
   ```

3. **Verify Ollama API is accessible**
   ```bash
   curl http://localhost:11434/api/tags
   ```

4. **Pull llama3.2 model**
   ```bash
   ollama pull llama3.2
   ollama list
   ```

5. **Test Ollama inference**
   ```bash
   curl -X POST http://localhost:11434/api/generate \
     -d '{"model":"llama3.2","prompt":"Hello","stream":false}'
   ```

---

## Backend Issues

### Backend Won't Start

**Problem**: `uvicorn main:app` fails to start

**Solutions**:

1. **Check Python version**
   ```bash
   python3 --version
   # Should be 3.8+
   ```

2. **Verify virtual environment**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   # or
   .venv\Scripts\activate  # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Check for missing environment variables**
   ```bash
   cat backend/.env
   # Ensure all required variables are set
   ```

5. **Check port availability**
   ```bash
   lsof -i :8000
   # If occupied, kill process or use different port
   ```

### Import Errors

**Problem**: `ModuleNotFoundError: No module named 'app'`

**Solutions**:

1. **Ensure you're in correct directory**
   ```bash
   cd backend
   pwd  # Should end in /backend
   ```

2. **Check PYTHONPATH**
   ```bash
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"
   ```

3. **Run from backend directory**
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```

### Database Migration Errors

**Problem**: `alembic upgrade head` fails

**Solutions**:

1. **Check database connection**
   ```bash
   docker exec varity-postgres psql -U varity -d varity -c "SELECT 1;"
   ```

2. **Reset migrations** (development only)
   ```bash
   cd backend
   rm -rf alembic/versions/*
   alembic revision --autogenerate -m "Initial migration"
   alembic upgrade head
   ```

3. **Check alembic.ini**
   ```bash
   # Verify sqlalchemy.url matches DATABASE_URL
   cat backend/alembic.ini
   ```

### API Returns 500 Error

**Problem**: Backend API returns Internal Server Error

**Solutions**:

1. **Check backend logs**
   ```bash
   tail -f backend/logs/app.log
   ```

2. **Enable debug mode**
   ```bash
   # In backend/.env
   DEBUG=true
   ```

3. **Test specific endpoint**
   ```bash
   curl -v http://localhost:8000/api/v1/marketplace/tools
   ```

4. **Check database is populated**
   ```bash
   docker exec varity-postgres psql -U varity -d varity -c "SELECT * FROM tools;"
   ```

---

## Frontend Issues

### Frontend Build Fails

**Problem**: `npm run build` fails

**Solutions**:

1. **Clear Next.js cache**
   ```bash
   rm -rf .next
   npm run build
   ```

2. **Delete node_modules and reinstall**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Node version**
   ```bash
   node --version
   # Should be v16+
   ```

4. **Check for TypeScript errors**
   ```bash
   npm run type-check
   ```

### Frontend Won't Start

**Problem**: `npm run dev` fails

**Solutions**:

1. **Check port 3001 is available**
   ```bash
   lsof -i :3001
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Check .env.local exists**
   ```bash
   ls -la .env.local
   # If missing: cp .env.local.example .env.local
   ```

4. **Clear Next.js cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

### Wallet Connection Fails

**Problem**: Privy/thirdweb wallet connection doesn't work

**Solutions**:

1. **Check Privy API keys**
   ```bash
   # In .env.local
   echo $NEXT_PUBLIC_PRIVY_APP_ID
   ```

2. **Verify Privy app is configured**
   - Go to: https://dashboard.privy.io
   - Check app settings
   - Verify allowed origins include localhost:3001

3. **Clear browser cache**
   - Open DevTools (F12)
   - Right-click refresh → "Empty Cache and Hard Reload"

4. **Check console for errors**
   ```javascript
   // Open browser console (F12)
   // Look for Privy initialization errors
   ```

5. **Test with different wallet provider**
   ```javascript
   // Try email instead of MetaMask
   // Try Google instead of email
   ```

### Components Not Rendering

**Problem**: React components show blank or errors

**Solutions**:

1. **Check browser console**
   - F12 → Console tab
   - Look for React errors

2. **Verify component imports**
   ```typescript
   // Check for incorrect import paths
   import { AIChat } from '@/components/AIChat'
   ```

3. **Check for missing props**
   ```typescript
   // Verify all required props are passed
   <AIChat walletAddress={address} />
   ```

4. **Clear React cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

---

## Smart Contract Issues

### Contract Deployment Fails

**Problem**: `npx hardhat run scripts/deploy.ts` fails

**Solutions**:

1. **Check network configuration**
   ```javascript
   // In hardhat.config.ts
   networks: {
     arbitrumSepolia: {
       url: process.env.ARBITRUM_SEPOLIA_RPC_URL,
       accounts: [process.env.DEPLOYER_PRIVATE_KEY]
     }
   }
   ```

2. **Verify deployer has ETH**
   - Check balance on Arbiscan
   - Get testnet ETH from faucet

3. **Check RPC URL is valid**
   ```bash
   curl -X POST $ARBITRUM_SEPOLIA_RPC_URL \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

4. **Compile contracts first**
   ```bash
   cd contracts
   npx hardhat clean
   npx hardhat compile
   ```

### Contract Compilation Errors

**Problem**: `npx hardhat compile` fails

**Solutions**:

1. **Check Solidity version**
   ```solidity
   // In contracts/*.sol
   pragma solidity ^0.8.20;
   ```

2. **Install OpenZeppelin contracts**
   ```bash
   cd contracts
   npm install @openzeppelin/contracts
   ```

3. **Clear Hardhat cache**
   ```bash
   npx hardhat clean
   rm -rf artifacts cache
   npx hardhat compile
   ```

4. **Check for syntax errors**
   - Read compiler output carefully
   - Fix syntax errors in contract files

### Transaction Reverts

**Problem**: Contract transactions revert with errors

**Solutions**:

1. **Check revert reason**
   ```bash
   # Look in transaction receipt for revert reason
   ```

2. **Verify allowance before purchase**
   ```javascript
   // Check USDC allowance
   const allowance = await usdc.allowance(userAddress, marketplaceAddress)
   if (allowance < price) {
     await usdc.approve(marketplaceAddress, price)
   }
   ```

3. **Check tool is registered**
   ```javascript
   const tool = await marketplace.getTool(toolId)
   // Verify tool exists and is active
   ```

4. **Ensure user has enough USDC**
   ```javascript
   const balance = await usdc.balanceOf(userAddress)
   console.log('USDC Balance:', balance.toString())
   ```

---

## Integration Issues

### QuickBooks Sync Fails

**Problem**: `/api/v1/integrations/quickbooks/sync` returns error

**Solutions**:

1. **Check wallet address is valid**
   ```bash
   curl -X POST http://localhost:8000/api/v1/integrations/quickbooks/sync \
     -H "Content-Type: application/json" \
     -d '{"wallet_address":"0x1234567890123456789012345678901234567890"}'
   ```

2. **Verify storage directory exists**
   ```bash
   mkdir -p backend/storage
   chmod 755 backend/storage
   ```

3. **Check backend logs**
   ```bash
   tail -f backend/logs/app.log | grep quickbooks
   ```

4. **Test storage write permissions**
   ```bash
   echo "test" > backend/storage/test.txt
   rm backend/storage/test.txt
   ```

### AI Chat Not Responding

**Problem**: AI chat endpoint times out or returns errors

**Solutions**:

1. **Verify Ollama is running**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Check if model is loaded**
   ```bash
   ollama list | grep llama3.2
   ```

3. **Test Ollama directly**
   ```bash
   curl -X POST http://localhost:11434/api/generate \
     -d '{"model":"llama3.2","prompt":"Test","stream":false}'
   ```

4. **Increase timeout**
   ```python
   # In backend AI service
   timeout = 60  # Increase from default
   ```

5. **Check if data exists for wallet**
   ```bash
   curl "http://localhost:8000/api/v1/integrations/quickbooks/data?wallet=0x..."
   ```

### Filecoin Upload Fails

**Problem**: Cannot upload to Filecoin storage

**Solutions**:

1. **Check storage service is initialized**
   ```python
   # In backend/app/services/filecoin_service.py
   # Verify service is properly configured
   ```

2. **Verify storage path exists**
   ```bash
   ls -la backend/storage/
   ```

3. **Check file permissions**
   ```bash
   chmod -R 755 backend/storage/
   ```

4. **Test with small file**
   ```python
   # Create minimal test file
   import json
   with open('backend/storage/test.json', 'w') as f:
       json.dump({'test': 'data'}, f)
   ```

---

## Performance Issues

### Slow Page Load Times

**Problem**: Frontend pages load slowly

**Solutions**:

1. **Check Next.js build**
   ```bash
   npm run build
   npm start  # Production mode
   ```

2. **Optimize images**
   ```typescript
   // Use Next.js Image component
   import Image from 'next/image'
   <Image src="/logo.png" width={200} height={50} alt="Logo" />
   ```

3. **Enable caching**
   ```typescript
   // In next.config.js
   module.exports = {
     images: {
       domains: ['yourdomain.com']
     }
   }
   ```

4. **Check network tab in DevTools**
   - F12 → Network tab
   - Look for slow requests

### Slow API Responses

**Problem**: Backend API is slow

**Solutions**:

1. **Add database indexes**
   ```sql
   CREATE INDEX idx_tools_category ON tools(category);
   CREATE INDEX idx_user_tools_wallet ON user_tools(wallet_address);
   ```

2. **Enable query caching**
   ```python
   # Use Redis for caching
   @cache.cached(timeout=300)
   def get_tools():
       # Query database
   ```

3. **Check database query performance**
   ```bash
   docker exec varity-postgres psql -U varity -d varity \
     -c "EXPLAIN ANALYZE SELECT * FROM tools;"
   ```

4. **Monitor database connections**
   ```bash
   docker exec varity-postgres psql -U varity -d varity \
     -c "SELECT * FROM pg_stat_activity;"
   ```

### AI Chat Takes Too Long

**Problem**: AI responses are very slow

**Solutions**:

1. **Use smaller model**
   ```bash
   # Try llama3.2:1b instead of llama3.2:latest
   ollama pull llama3.2:1b
   ```

2. **Reduce context size**
   ```python
   # Limit RAG context to top 3 results instead of 10
   results = vector_search(query, limit=3)
   ```

3. **Enable streaming responses**
   ```python
   # Stream AI responses instead of waiting for full completion
   async def stream_response():
       async for chunk in ollama.generate(stream=True):
           yield chunk
   ```

4. **Cache common queries**
   ```python
   # Cache AI responses for common questions
   @cache.cached(timeout=3600, key_prefix='ai_response')
   def get_ai_response(query):
       # Generate response
   ```

---

## Getting Help

If you can't resolve an issue using this guide:

1. **Check the logs**
   ```bash
   # Backend logs
   tail -f backend/logs/app.log

   # Docker logs
   docker-compose logs -f

   # Frontend logs
   # Check browser console (F12)
   ```

2. **Run diagnostic script**
   ```bash
   ./scripts/e2e-test.sh
   ```

3. **Create GitHub issue**
   - Include error messages
   - Include relevant logs
   - Include steps to reproduce

4. **Contact support**
   - Email: support@varity.ai
   - Discord: discord.gg/varity

---

## Common Error Messages

### "ModuleNotFoundError: No module named 'app'"
- **Cause**: Wrong working directory or PYTHONPATH not set
- **Fix**: `cd backend && python -m uvicorn main:app`

### "Connection refused" (PostgreSQL)
- **Cause**: PostgreSQL container not running
- **Fix**: `docker-compose up -d postgres`

### "Model not found: llama3.2"
- **Cause**: Ollama model not downloaded
- **Fix**: `ollama pull llama3.2`

### "CORS error" (Frontend → Backend)
- **Cause**: CORS not configured in backend
- **Fix**: Add frontend URL to CORS allowed origins

### "Insufficient allowance" (Smart contracts)
- **Cause**: USDC approval not granted
- **Fix**: Call `usdc.approve(marketplace, amount)` first

### "Nonce too low" (Blockchain)
- **Cause**: Transaction nonce out of sync
- **Fix**: Reset MetaMask account or wait for pending transactions

---

Last Updated: 2024-11-14
