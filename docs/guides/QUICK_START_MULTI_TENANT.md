# Quick Start: Multi-Tenant RAG Infrastructure

Get the multi-tenant RAG infrastructure running in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- Python 3.8+ with pip
- 8GB RAM minimum (for Ollama LLM)

## Step 1: Start Infrastructure (2 minutes)

```bash
# Navigate to project directory
cd /home/macoding/blokko-internal-os/varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard

# Start all services
docker-compose up -d

# Wait for services to be healthy (30-60 seconds)
docker-compose ps
```

**Expected Output**:
```
NAME                IMAGE                  STATUS
varity-postgres     postgres:15-alpine     Up 30 seconds (healthy)
varity-redis        redis:7-alpine         Up 30 seconds (healthy)
varity-ollama       ollama/ollama:latest   Up 30 seconds (healthy)
varity-qdrant       qdrant/qdrant:latest   Up 30 seconds (healthy)
```

## Step 2: Pull AI Model (1 minute)

```bash
# Pull Mistral model (or llama3.2 for better performance)
docker exec -it varity-ollama ollama pull mistral

# Verify model is available
docker exec -it varity-ollama ollama list
```

**Alternative Models**:
- `mistral` - Fast, good for testing
- `llama3.2` - Better accuracy, slower
- `phi` - Smallest, fastest, lower quality

## Step 3: Install Python Dependencies (1 minute)

```bash
cd backend

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Key Dependencies Installed**:
- `qdrant-client` - Vector database client
- `sentence-transformers` - Local embeddings (no API calls)
- `sentry-sdk` - Error monitoring

## Step 4: Run Test Suite (1 minute)

```bash
# Run multi-tenant isolation test
python test_multi_tenant_isolation.py
```

**Expected Result**:
```
============================================================
MULTI-TENANT RAG INFRASTRUCTURE TEST SUITE
============================================================

✅ All services are healthy
✅ Successfully indexed data for 3 businesses
✅ All businesses have isolated collections
✅ Answer contains Business A's data only
✅ Answer contains Business B's data only
✅ Cross-business access correctly denied
✅ RAG stats verified for all businesses

============================================================
TEST SUMMARY
============================================================
Total Tests: 7
Passed: 7
Failed: 0

✅ ALL TESTS PASSED! Multi-tenant isolation is working correctly.
```

## Step 5: Test API Endpoints

### Start Backend Server

```bash
# In backend/ directory with venv activated
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Test Health Endpoint

```bash
curl http://localhost:8000/api/ai/health
```

**Expected Response**:
```json
{
  "success": true,
  "health": {
    "ollama": true,
    "qdrant": true,
    "overall": true
  },
  "timestamp": "2025-11-16T20:30:00"
}
```

### Test Multi-Tenant AI Query

```bash
curl -X POST http://localhost:8000/api/ai/query/multitenant \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are my top products?",
    "wallet_address": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "integration": "quickbooks",
    "max_results": 5
  }'
```

### Test RAG Stats

```bash
curl "http://localhost:8000/api/ai/rag/stats?wallet_address=0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
```

## Architecture Verification

### Check Qdrant Collections

```bash
# View all collections
curl http://localhost:6333/collections
```

**Expected**: Each business has its own collection
```json
{
  "result": {
    "collections": [
      {"name": "business_aaa..."},
      {"name": "business_bbb..."},
      {"name": "business_ccc..."}
    ]
  }
}
```

### Check Ollama Models

```bash
docker exec -it varity-ollama ollama list
```

### Check Service Logs

```bash
# Qdrant logs
docker logs varity-qdrant --tail 50

# Ollama logs
docker logs varity-ollama --tail 50

# Backend logs (if running via Docker)
docker logs varity-backend --tail 50
```

## Common Issues & Solutions

### Issue: Qdrant fails to start

**Error**: `Cannot start service qdrant`

**Solution**:
```bash
# Check port availability
lsof -i :6333

# If port is in use, change in docker-compose.yml or stop conflicting service
```

### Issue: Ollama model download fails

**Error**: `Failed to pull model`

**Solution**:
```bash
# Check internet connection
ping ollama.ai

# Try smaller model
docker exec -it varity-ollama ollama pull phi

# Check available disk space
df -h
```

### Issue: Python dependencies fail to install

**Error**: `Failed building wheel for torch`

**Solution**:
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install -y python3-dev build-essential

# Or use pre-built wheels
pip install --no-cache-dir torch sentence-transformers
```

### Issue: Test suite fails on Business A query

**Error**: `Answer doesn't mention Business A's products`

**Solution**:
```bash
# Wait longer for model to warm up
sleep 30

# Or use a better model
docker exec -it varity-ollama ollama pull llama3.2
# Update .env: OLLAMA_MODEL=llama3.2
```

## Development Workflow

### 1. Upload Business Data

```python
from app.services.filecoin_service import FilecoinMultiTenantService
from app.services.rag_service import BusinessRAGService
from app.services.encryption_service import EncryptionService

# Initialize services
filecoin = FilecoinMultiTenantService()
rag = BusinessRAGService()
encryption = EncryptionService()

# Upload and index
wallet = "0xYourBusinessWallet"
data = {"invoice": "INV-001", "amount": "$1000"}

# Encrypt
encrypted = await encryption.encrypt_with_wallet(
    data=json.dumps(data),
    customer_wallet=wallet
)

# Upload to Filecoin
cid = await filecoin.upload_business_data(
    business_wallet=wallet,
    integration="quickbooks",
    data_type="invoices",
    data=data,
    encrypted_data=encrypted
)

# Index in RAG
await rag.index_business_data(
    business_wallet=wallet,
    cid=cid,
    data=data,
    integration="quickbooks",
    data_type="invoices"
)
```

### 2. Query Business AI

```python
from app.services.ollama_service import OllamaBusinessService

ollama = OllamaBusinessService()

result = await ollama.query_business_ai(
    business_wallet="0xYourBusinessWallet",
    user_query="What's my total revenue this month?",
    integration="quickbooks"
)

print(f"Answer: {result['answer']}")
print(f"Sources: {result['sources']}")
```

### 3. Check Collection Stats

```python
from app.services.rag_service import BusinessRAGService

rag = BusinessRAGService()

stats = await rag.get_collection_stats("0xYourBusinessWallet")
print(f"Documents indexed: {stats['count']}")
```

## Production Deployment

### Option 1: Docker Compose (Simple)

```bash
# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Configure .env for production
cp .env.example .env.production
# Edit .env.production with production values
```

### Option 2: Kubernetes (Scalable)

```bash
# Deploy to K8s cluster
kubectl apply -f k8s/qdrant-deployment.yml
kubectl apply -f k8s/backend-deployment.yml

# Check pods
kubectl get pods -n varity
```

### Option 3: Akash Network (Decentralized)

```bash
# Deploy Ollama to Akash
akash tx deployment create akash-ollama.yml --from varity-wallet

# Get provider URL
akash provider lease-status --dseq <deployment-id>

# Update backend .env
OLLAMA_URL=http://<akash-provider>:11434
```

## Next Steps

1. **Integrate with Frontend**: Connect React/Next.js frontend to multi-tenant API
2. **Add More Integrations**: Extend beyond QuickBooks (Salesforce, Shopify, etc.)
3. **Deploy to Production**: Choose deployment option above
4. **Set up Monitoring**: Configure Sentry, Prometheus, Grafana
5. **Implement Caching**: Redis cache for frequent RAG queries

## Resources

- **Full Documentation**: `/MULTI_TENANT_RAG_INFRASTRUCTURE.md`
- **API Reference**: `http://localhost:8000/docs` (when backend running)
- **Test Script**: `/backend/test_multi_tenant_isolation.py`
- **Qdrant Dashboard**: `http://localhost:6333/dashboard`
- **Ollama API**: `http://localhost:11434/api/tags`

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review documentation: `/MULTI_TENANT_RAG_INFRASTRUCTURE.md`
3. Run health checks: `curl http://localhost:8000/api/ai/health`

---

**Total Setup Time**: ~5 minutes
**Architecture**: Multi-tenant, fully isolated, cost-efficient
**Cost Savings**: 77-86% vs. Google Cloud Platform
