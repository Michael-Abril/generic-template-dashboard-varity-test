# AI Chat Quick Reference Guide

**For**: Developers working with the Generic Template AI Chat system
**Last Updated**: December 5, 2025

---

## Quick Start

### Testing the AI Chat

```bash
# 1. Ensure services are running
docker-compose ps

# Expected services:
# - generic-template-ollama (port 11434)
# - qdrant (port 6333)
# - postgres
# - redis
# - backend (port 8002)

# 2. Test chat endpoint
curl -X POST http://localhost:8002/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are my recent transactions?",
    "wallet_address": "0x1234...",
    "use_rag": true
  }'

# 3. Check health
curl http://localhost:8002/api/v1/ai/health
```

---

## Key Endpoints

### POST `/api/v1/ai/chat`
Main chat endpoint with RAG context

**Request**:
```json
{
  "message": "Your question here",
  "wallet_address": "0x...",
  "conversation_id": "optional-conv-id",
  "use_rag": true
}
```

**Response**:
```json
{
  "response": "AI generated answer",
  "conversation_id": "conv-123456",
  "sources": [
    {
      "tool": "quickbooks",
      "data_type": "invoices",
      "cid": "QmXyz...",
      "uploaded_at": "2025-12-05T10:00:00Z"
    }
  ],
  "metadata": {
    "wallet": "0x...",
    "tools_used": ["quickbooks", "salesforce"],
    "rag_enabled": true,
    "timestamp": "2025-12-05T10:00:00Z"
  }
}
```

### POST `/api/v1/ai/query/multitenant`
Multi-tenant query with strict business isolation

**Request**:
```json
{
  "query": "Show me sales data",
  "wallet_address": "0x...",
  "integration": "salesforce",  // optional filter
  "data_type": "opportunities",  // optional filter
  "max_results": 5
}
```

**Response**:
```json
{
  "success": true,
  "answer": "Based on your Salesforce data...",
  "sources": ["QmAbc...", "QmDef..."],
  "context_used": true,
  "wallet_address": "0x...",
  "metadata": {...}
}
```

### GET `/api/v1/ai/health`
Check AI infrastructure health

**Response**:
```json
{
  "success": true,
  "health": {
    "ollama": {
      "status": "healthy",
      "url": "http://generic-template-ollama:11434",
      "model": "mistral"
    },
    "qdrant": {
      "status": "healthy"
    },
    "overall": true
  }
}
```

---

## Common Issues & Solutions

### Issue: "Ollama connection failed"

**Symptoms**:
```
HTTPError: Connection refused
```

**Solution**:
```bash
# Check if Ollama is running
docker ps | grep ollama

# Check logs
docker logs generic-template-ollama

# Restart
docker-compose restart ollama

# Test directly
curl http://generic-template-ollama:11434/api/tags
```

---

### Issue: "Qdrant query failed"

**Symptoms**:
```
Failed to query Qdrant collection
```

**Solution**:
```bash
# Check Qdrant
curl http://localhost:6333/collections

# Check if business collection exists
curl http://localhost:6333/collections/business_{wallet}

# Restart Qdrant
docker-compose restart qdrant
```

---

### Issue: "No RAG context available"

**Symptoms**:
```
AI response: "I don't have that information in the current data"
```

**Solution**:
```bash
# 1. Check if data has been indexed
curl "http://localhost:8002/api/v1/ai/rag/stats?wallet_address=0x..."

# 2. Manually index some data
curl -X POST http://localhost:8002/api/v1/ai/rag/index \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x...",
    "cid": "QmTest...",
    "data": {"sample": "data"},
    "integration": "test",
    "data_type": "test_data"
  }'

# 3. Trigger integration sync
curl -X POST http://localhost:8002/api/v1/sync \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x...",
    "integration": "quickbooks"
  }'
```

---

### Issue: "Embedding generation failed"

**Symptoms**:
```
WARNING: Failed to generate embedding after 3 attempts
```

**Solution**:
```bash
# 1. Check Ollama has embedding model
curl http://generic-template-ollama:11434/api/tags | grep nomic-embed-text

# 2. Pull embedding model if missing
docker exec generic-template-ollama ollama pull nomic-embed-text

# 3. Test embedding generation
curl -X POST http://generic-template-ollama:11434/api/embeddings \
  -d '{"model": "nomic-embed-text", "prompt": "test text"}'
```

---

## Configuration

### Environment Variables

```bash
# Ollama Configuration
OLLAMA_URL=http://generic-template-ollama:11434
OLLAMA_MODEL=mistral
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Qdrant Configuration
QDRANT_URL=http://localhost:6333

# ZK Rollup (optional)
ZK_ROLLUP_ADDRESS=0x704CED9F7751E13A4cbF820555E161B3B18F435f
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
```

### Adjustable Parameters

In `ai_query_service.py`:
```python
# LLM parameters
"temperature": 0.7,      # Lower = more deterministic
"top_p": 0.9,           # Nucleus sampling
"max_tokens": 800,      # Max response length
"num_predict": 800,     # Ollama-specific
```

In `rag_service.py`:
```python
# RAG parameters
limit: int = 5,              # Number of sources
min_score: float = 0.5,      # Relevance threshold (0.0-1.0)
embedding_dimension = 768,   # nomic-embed-text dimension
max_chars = 6000,           # Text truncation limit
```

---

## Testing Checklist

Before deploying AI chat changes:

- [ ] All services running (`docker-compose ps`)
- [ ] Ollama health check passes
- [ ] Qdrant health check passes
- [ ] Test chat with empty message (should fail gracefully)
- [ ] Test chat with very long message (should truncate)
- [ ] Test chat with no RAG data (should provide helpful fallback)
- [ ] Test chat with RAG data (should cite sources)
- [ ] Test multi-tenant isolation (Business A can't see Business B data)
- [ ] Check logs for errors (`docker-compose logs backend`)
- [ ] Verify response times (<5s for most queries)

---

## Performance Benchmarks

Expected performance (with data):

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| **Simple chat** | 1-3s | No RAG context |
| **Chat with RAG** | 3-6s | Including retrieval |
| **Embedding generation** | 100-500ms | Per document |
| **RAG query** | 200-800ms | Vector search |
| **LLM generation** | 2-5s | Depends on response length |

If times exceed these significantly, check:
- Ollama container resources (CPU/RAM)
- Qdrant collection size
- Network latency to containers

---

## Debugging Tips

### Enable Verbose Logging

```python
# In backend/app/services/ai_query_service.py
logger.setLevel(logging.DEBUG)

# In backend/app/services/rag_service.py
logger.setLevel(logging.DEBUG)
```

### Monitor Real-Time Logs

```bash
# All services
docker-compose logs -f

# Just backend
docker-compose logs -f backend

# Just Ollama
docker-compose logs -f ollama

# Just Qdrant
docker-compose logs -f qdrant
```

### Test Individual Components

```python
# Test RAG service directly
from app.services.rag_service import BusinessRAGService

rag = BusinessRAGService()
results = await rag.query_business_rag(
    business_wallet="0x1234...",
    query="test query"
)
print(results)

# Test Ollama service directly
from app.services.ollama_service import OllamaBusinessService

ollama = OllamaBusinessService()
response = await ollama.query_business_ai(
    business_wallet="0x1234...",
    user_query="test query"
)
print(response)
```

---

## Best Practices

### 1. Always Use RAG Context
```python
# Good
ChatRequest(
    message="What are my sales?",
    wallet_address="0x...",
    use_rag=True  # ✅
)

# Bad
ChatRequest(
    message="What are my sales?",
    wallet_address="0x...",
    use_rag=False  # ❌ Generic response without data
)
```

### 2. Handle Errors Gracefully
```python
try:
    response = await ai_chat(request)
except Exception as e:
    # Don't crash - provide fallback
    return ChatResponse(
        response="Service temporarily unavailable",
        metadata={"error": True}
    )
```

### 3. Validate Input
```python
# Check message length
if len(request.message) > 5000:
    raise HTTPException(400, "Message too long")

# Check for empty messages
if not request.message.strip():
    raise HTTPException(400, "Message cannot be empty")
```

### 4. Monitor Performance
```python
import time

start = time.time()
response = await ai_query_service.process_query(...)
duration = time.time() - start

logger.info(f"Query completed in {duration:.2f}s")
```

---

## Security Notes

### Multi-Tenant Isolation
- Each business has isolated Qdrant collection
- Collection name: `business_{wallet_address_lower}`
- Cross-business queries are impossible by design

### Data Privacy
- All Filecoin data is encrypted with Lit Protocol
- RAG queries only access business's own data
- ZK rollup logs for audit trail (privacy-preserving)

### API Security
- Wallet address required for all queries
- Rate limiting recommended (not yet implemented)
- CORS configured for frontend origin

---

## Quick Commands Reference

```bash
# Start services
docker-compose up -d

# Check health
curl http://localhost:8002/api/v1/ai/health

# Test chat
curl -X POST http://localhost:8002/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","wallet_address":"0x123","use_rag":true}'

# Check RAG stats
curl "http://localhost:8002/api/v1/ai/rag/stats?wallet_address=0x123"

# View logs
docker-compose logs -f backend

# Restart AI services
docker-compose restart ollama qdrant

# Stop all services
docker-compose down
```

---

## Additional Resources

- **Full Architecture**: `/docs/ARCHITECTURE.md`
- **API Documentation**: http://localhost:8002/docs
- **Varity CLAUDE.md**: `/home/macoding/blokko-internal-os/varity/CLAUDE.md`
- **Improvements Report**: `/AI_CHAT_IMPROVEMENTS_REPORT.md`

---

**Quick Reference Guide**
**Version**: 1.0
**Last Updated**: December 5, 2025
