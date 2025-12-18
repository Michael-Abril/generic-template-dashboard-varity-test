# API Quick Reference - Generic Company Dashboard

## Base URL
```
http://localhost:8000
```

## API Documentation
```
http://localhost:8000/docs (Swagger UI)
http://localhost:8000/redoc (ReDoc)
```

---

## 📦 Marketplace API (`/api/v1/marketplace`)

### List All Tools
```bash
GET /api/v1/marketplace/tools
GET /api/v1/marketplace/tools?category=accounting
GET /api/v1/marketplace/tools?active_only=true
```

### Get Tool Details
```bash
GET /api/v1/marketplace/tools/{tool_id}
```

### Purchase Tool
```bash
POST /api/v1/marketplace/purchase
Content-Type: application/json

{
  "tool_id": 1,
  "wallet_address": "0x...",
  "payment_method": "web3"
}
```

### Get User Licenses
```bash
GET /api/v1/marketplace/licenses/{wallet_address}
```

### Get Categories
```bash
GET /api/v1/marketplace/categories
```

---

## 🔗 Integrations API (`/api/v1/integrations`)

### Get Installed Tools
```bash
GET /api/v1/integrations/installed?wallet_address=0x...
```

### Sync Tool Data
```bash
POST /api/v1/integrations/quickbooks/sync
Content-Type: application/json

{
  "wallet_address": "0x...",
  "force": false
}
```

### Get Tool Data
```bash
GET /api/v1/integrations/quickbooks/data?wallet_address=0x...
GET /api/v1/integrations/quickbooks/data?wallet_address=0x...&data_type=invoices
```

### Get Tool Schema
```bash
GET /api/v1/integrations/quickbooks/schema
```

### Delete Tool Data
```bash
DELETE /api/v1/integrations/quickbooks/data?wallet_address=0x...
```

---

## 🤖 AI Chatbot API (`/api/v1/ai`)

### Chat with AI
```bash
POST /api/v1/ai/chat
Content-Type: application/json

{
  "message": "What invoices are overdue?",
  "wallet_address": "0x...",
  "conversation_id": "conv-123",
  "use_rag": true
}
```

### Advanced Query
```bash
POST /api/v1/ai/query
Content-Type: application/json

{
  "query": "Compare my revenue to expenses this quarter",
  "wallet_address": "0x...",
  "tools": ["quickbooks", "salesforce"]
}
```

### Get Query Suggestions
```bash
GET /api/v1/ai/suggestions?wallet_address=0x...
```

### Get Query History
```bash
GET /api/v1/ai/history?wallet_address=0x...&limit=20
```

---

## 💾 Storage API (`/api/v1/storage`)

### Upload Data
```bash
POST /api/v1/storage/upload
Content-Type: application/json

{
  "customer_wallet": "0x...",
  "integration": "quickbooks",
  "data_type": "invoices",
  "data": {...},
  "metadata": {...}
}
```

### Retrieve Data
```bash
POST /api/v1/storage/retrieve
Content-Type: application/json

{
  "cid": "Qm...",
  "customer_wallet": "0x...",
  "auth_signature": {...}
}
```

### List Files
```bash
POST /api/v1/storage/list
Content-Type: application/json

{
  "customer_wallet": "0x...",
  "integration": "quickbooks",
  "data_type": "invoices",
  "limit": 100
}
```

### Get Encryption Metadata
```bash
GET /api/v1/storage/metadata/{wallet_address}
```

### Delete File
```bash
DELETE /api/v1/storage/{cid}?customer_wallet=0x...
```

---

## Available Tools

| ID | Name | Category | Price/Month |
|----|------|----------|-------------|
| 1 | QuickBooks | accounting | $29.99 |
| 2 | Salesforce | crm | $49.99 |
| 3 | Stripe | payments | $19.99 |
| 4 | Gmail | productivity | $9.99 |
| 5 | Google Calendar | productivity | $9.99 |

---

## QuickBooks Data Structure

### Invoices
```json
{
  "id": "INV-0001",
  "amount": 5000.00,
  "customer": "Acme Corporation",
  "customer_id": "CUST-001",
  "date": "2025-01-10",
  "due_date": "2025-02-10",
  "status": "paid|pending|overdue",
  "description": "Monthly services",
  "payment_terms": "Net 30"
}
```

### Expenses
```json
{
  "id": "EXP-0001",
  "amount": 1200.00,
  "vendor": "Office Depot",
  "category": "Office Supplies",
  "date": "2025-01-12",
  "description": "Office Supplies - Office Depot",
  "payment_method": "Credit Card",
  "receipt": "receipt-0001.pdf"
}
```

### Customers
```json
{
  "id": "CUST-001",
  "name": "Acme Corporation",
  "email": "acme.corporation@example.com",
  "phone": "+1-555-123-4567",
  "total_invoiced": 15000.00,
  "created_date": "2024-05-15"
}
```

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "detail": "Error message"
}
```

### AI Chat Response
```json
{
  "response": "AI-generated answer...",
  "conversation_id": "conv-123",
  "sources": [
    {
      "tool": "quickbooks",
      "data_type": "invoices",
      "cid": "Qm..."
    }
  ],
  "metadata": {
    "wallet": "0x...",
    "tools_used": ["quickbooks"],
    "rag_enabled": true,
    "timestamp": "2025-01-14T12:00:00Z"
  }
}
```

---

## Testing with curl

### Complete Workflow
```bash
# 1. List available tools
curl http://localhost:8000/api/v1/marketplace/tools

# 2. Purchase QuickBooks
curl -X POST http://localhost:8000/api/v1/marketplace/purchase \
  -H "Content-Type: application/json" \
  -d '{"tool_id": 1, "wallet_address": "0x1234"}'

# 3. Sync QuickBooks data
curl -X POST http://localhost:8000/api/v1/integrations/quickbooks/sync \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x1234", "force": false}'

# 4. Query AI about the data
curl -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are my overdue invoices?",
    "wallet_address": "0x1234",
    "use_rag": true
  }'
```

---

## Environment Variables

Required `.env` file:
```bash
# Pinata (Filecoin/IPFS)
PINATA_API_KEY=your_key
PINATA_SECRET_API_KEY=your_secret
PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# Lit Protocol
LIT_NETWORK=cayenne

# Blockchain
VARITY_CHAIN_NAME=Varity-L3-Testnet
BLOCKCHAIN_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

---

## Running the Server

```bash
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## File Locations

```
backend/
├── app/
│   ├── main.py                      # Main FastAPI app
│   ├── api/v1/
│   │   ├── marketplace.py           # Marketplace endpoints
│   │   ├── integrations.py          # Integration endpoints
│   │   └── ai.py                    # AI chatbot endpoints
│   └── services/
│       ├── filecoin_service.py      # Storage service
│       ├── encryption_service.py    # Lit Protocol
│       └── ai_query_service.py      # AI/RAG service
└── adapters/
    └── quickbooks/
        └── quickbooks_adapter.py    # QuickBooks stub
```
