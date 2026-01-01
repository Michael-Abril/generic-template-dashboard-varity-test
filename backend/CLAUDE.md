# CLAUDE.md - Backend (FastAPI)

**Last Updated:** December 31, 2025
**Framework:** FastAPI + SQLAlchemy + Pydantic + MCP
**Python Version:** 3.8+
**Production:** https://generic-template-dashboard-production.up.railway.app (Railway)
**MCP Architecture:** 6 Integration MCP Servers + Encrypted Data Pipeline
**L3 Blockchain:** Varity Testnet (Conduit Arbitrum Orbit) - Chain ID 33529

---

## CRITICAL STATUS

### MCP Data Pipeline Architecture (December 31, 2025)

**NEW:** Model Context Protocol (MCP) integration for production-ready data fetching.

| Component | Status | Purpose |
|-----------|--------|---------|
| **MCP Server Registry** | ✅ CONFIGURED | `mcp_servers/config.py` - 6 vetted MCP servers |
| **MCP Client** | ✅ READY | `mcp_servers/client.py` - Async stdio transport |
| **MCP Ingestion Pipeline** | ✅ READY | `app/services/mcp_ingestion_service.py` - Encrypt + Route |
| **L3 Commitment Service** | ✅ READY | `app/services/l3_commitment_service.py` - On-chain verification |

**Data Flow:**
```
MCP Fetch → Encryption (AES-256-GCM) → Route (RAG/Live/Hybrid) → L3 Batch Commit
```

**Active MCP Servers:**
1. Google Workspace (@anthropic/google-workspace-mcp)
2. Slack (korotovsky/slack-mcp-server)
3. QuickBooks (@anthropic/quickbooks-online-mcp-server)
4. Microsoft 365 (Softeria/ms-365-mcp-server)
5. Salesforce (Community/MCP-Salesforce)
6. HubSpot (@hubspot/mcp-server)

### Recent Fixes (December 26, 2025)

| Fix | Files Changed | Status |
|-----|---------------|--------|
| **Pinata Gateway** | `core/config.py`, `services/filecoin_service.py` | ✅ DEPLOYED |
| **Slack OAuth** | `api/v1/integrations.py` | ✅ DEPLOYED |

**Pinata Gateway Fix:**
- Switched from public gateway (`gateway.pinata.cloud`) to dedicated gateway
- Dedicated gateway has NO rate limits for retrieval
- Added `PINATA_GATEWAY_URL` env var support
- Added retry logic with exponential backoff
- Railway env var: `PINATA_GATEWAY_URL=https://varity.mypinata.cloud`

**Slack OAuth Fix:**
- Fixed `'OAuthToken' object has no attribute 'encrypted_token'`
- Use `oauth_token.access_token` property (auto-decrypts via model)
- Required scopes: `channels:read`, `channels:history`, `groups:read`, `groups:history`, `users:read`, `files:read`, `chat:write`

### Infrastructure Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Health Check** | ✅ Working | `/health` returns healthy |
| **Pinata Storage** | ✅ Working | Dedicated gateway, no rate limits |
| **Qdrant (RAG)** | ⚠️ Partial | Not all data being indexed |
| **AI Chat** | ✅ Working | Together.ai integration |
| **Conversations** | ✅ Working | Full CRUD operations |

### Integration Status (NONE FULLY WORKING)

| Integration | OAuth | Data Sync | RAG Index | Live API | Issue |
|-------------|:-----:|:---------:|:---------:|:--------:|-------|
| **QuickBooks** | ✅ | ⚠️ Partial | ❌ | ❌ | Needs data pipeline |
| **Google** | ✅ | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial | Needs completion |
| **Microsoft** | ❌ | ❌ | ❌ | ⚠️ Partial | OAuth broken |
| **Slack** | ✅ | ⚠️ Files only | ⚠️ Files only | ✅ | Working |
| **Salesforce** | ❓ | ❓ | ❌ | ❌ | Testing |
| **HubSpot** | ❓ | ❓ | ❌ | ❌ | Testing |

---

## LIVE DEPLOYMENT

| Service | URL |
|---------|-----|
| **API Base** | https://generic-template-dashboard-production.up.railway.app |
| **Health** | https://generic-template-dashboard-production.up.railway.app/health |
| **API Docs** | https://generic-template-dashboard-production.up.railway.app/docs |
| **ReDoc** | https://generic-template-dashboard-production.up.railway.app/redoc |

---

## API ENDPOINTS

### OAuth (`/api/v1/oauth`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/start/{provider}` | POST | Initiate OAuth flow |
| `/callback` | POST | Handle OAuth callback |
| `/status/{provider}` | GET | Check connection status |

### AI (`/api/v1/ai`)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/chat/general` | POST | General AI chat | ✅ Working |
| `/query/combined` | POST | RAG + optional web search | ✅ Working |
| `/research` | POST | Deep research mode | ✅ Working |
| `/analyze/document` | POST | Document analysis | ⚠️ Partial |
| `/health` | GET | AI service health | ✅ Working |
| `/models` | GET | List available models | ✅ Working |

### Conversations (`/api/v1/conversations`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | List conversations |
| `/` | POST | Create conversation |
| `/{id}` | GET | Get with messages |
| `/{id}` | PATCH | Update (rename, pin) |
| `/{id}` | DELETE | Delete conversation |
| `/{id}/messages` | POST | Add message |
| `/{id}/pin` | POST | Pin conversation |
| `/{id}/unpin` | POST | Unpin conversation |
| `/{id}/archive` | POST | Archive conversation |

### Integrations (`/api/v1/integrations`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/installed` | GET | List user's integrations |
| `/{provider}/data` | GET | Get synced data |
| `/{provider}/sync` | POST | Trigger data sync |
| `/{provider}` | DELETE | Disconnect integration |

### Google Workspace (`/api/v1/integrations/google`)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/send-email` | POST | Send via Gmail | ✅ Working |
| `/upload-file` | POST | Upload to Drive | ✅ Working |
| `/emails/{id}` | PATCH | Archive/label email | ✅ Working |
| `/contacts` | POST | Create contact | ⚠️ Partial |
| `/events` | POST | Create calendar event | ⚠️ Partial |

### Microsoft 365 (`/api/v1/integrations/microsoft`)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/mail/send` | POST | Send via Outlook | ❓ Untested |
| `/onedrive/upload` | POST | Upload to OneDrive | ❓ Untested |

### Dashboard (`/api/v1/dashboard`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/kpis` | GET | Get KPI metrics |
| `/recent-activity` | GET | Get recent activity |
| `/quick-actions` | GET | Get available actions |

---

## DIRECTORY STRUCTURE

```
backend/
├── app/
│   ├── main.py                    # FastAPI app entry
│   │
│   ├── api/v1/                    # REST endpoints
│   │   ├── __init__.py            # Router registration
│   │   ├── ai.py                  # AI chat (Together.ai)
│   │   ├── oauth.py               # OAuth handlers
│   │   ├── integrations.py        # Integration management
│   │   ├── conversations.py       # Chat history CRUD
│   │   ├── dashboard.py           # Dashboard KPIs
│   │   ├── google.py              # Google Workspace actions
│   │   ├── microsoft.py           # Microsoft 365 actions
│   │   ├── sync.py                # Data sync triggers
│   │   ├── settings.py            # User settings
│   │   ├── onboarding.py          # Onboarding status
│   │   └── feedback.py            # Feedback collection
│   │
│   ├── adapters/                  # Integration adapters
│   │   ├── google/sync.py         # ✅ Working
│   │   ├── quickbooks/sync.py     # ✅ Production ready
│   │   ├── microsoft/sync.py      # ❓ Untested
│   │   ├── slack/sync.py          # ❓ Untested
│   │   ├── salesforce/sync.py     # ❓ Untested
│   │   ├── hubspot/sync.py        # ❓ Untested
│   │   └── ... (19 more)
│   │
│   ├── core/
│   │   ├── config.py              # Settings (Pydantic)
│   │   ├── database.py            # SQLAlchemy async
│   │   └── startup.py             # Service initialization
│   │
│   ├── services/
│   │   ├── together_service.py      # Together.ai LLM
│   │   ├── ollama_service.py        # Ollama fallback
│   │   ├── rag_service.py           # Qdrant + Filecoin
│   │   ├── filecoin_service.py      # Pinata IPFS
│   │   ├── encryption_service.py    # AES-256-GCM
│   │   ├── web_search_service.py    # Tavily/Serper
│   │   ├── mcp_ingestion_service.py # MCP → Encrypt → Route → L3
│   │   └── l3_commitment_service.py # Varity L3 on-chain verification
│   │
│   ├── models/
│   │   ├── conversation.py          # Chat models
│   │   ├── integration.py           # OAuth tokens
│   │   └── user.py                  # User model
│   │
│   └── (adapters deprecated)        # Replaced by MCP servers
│
├── mcp_servers/
│   ├── config.py                  # MCP server registry (6 servers)
│   └── client.py                  # MCP client wrapper + data fetchers
│
├── alembic/                       # Migrations
├── requirements.txt               # Dependencies
├── .env                           # Environment vars (development)
├── .env.example                   # Template with all variables
└── CLAUDE.md                      # This file
```

---

## KEY SERVICES

### Together.ai Service (`services/together_service.py`)

```python
# Primary LLM provider
model = "meta-llama/Llama-3.3-70B-Instruct-Turbo"

# Functions:
- chat(message, wallet_address, context)
- analyze_document(content, analysis_type, wallet_address)
- deep_research(query, wallet_address, depth)
```

### Filecoin Service (`services/filecoin_service.py`)

```python
# Data storage via Pinata

# Functions:
- upload_encrypted_data(customer_wallet, integration, data_type, data)
- list_customer_files(customer_wallet, integration, latest_only)
- retrieve_and_decrypt(cid, customer_wallet)
```

### RAG Service (`services/rag_service.py`)

```python
# Vector DB with Qdrant

# Each wallet gets isolated collection:
collection_name = f"business_{wallet_clean}"

# Functions:
- index_business_data(business_wallet, cid, data, integration, data_type)
- query_business_rag(business_wallet, query, limit)
```

### Encryption Service (`services/encryption_service.py`)

```python
# AES-256-GCM with PBKDF2 key derivation

# Each wallet = unique encryption key
def derive_customer_key(wallet_address: str) -> bytes:
    salt = hashlib.sha256(f"varity-oauth-{wallet}-{chain_id}".encode()).digest()[:16]
    kdf = PBKDF2HMAC(algorithm=SHA256(), length=32, salt=salt, iterations=100000)
    return kdf.derive(wallet.encode())
```

---

## DATA SYNC FLOW

```
1. Frontend: POST /api/v1/integrations/{provider}/sync
   ↓
2. Backend: Get OAuth tokens from database
   ↓
3. Adapter: Fetch data from provider API
   ↓
4. Encrypt: AES-256-GCM with wallet-derived key
   ↓
5. Store: Upload to Pinata (Filecoin/IPFS)
   ↓
6. Index: Add to Qdrant with CID reference
   ↓
7. Return: Success + CIDs
```

### Google Sync Adapter (`adapters/google/sync.py`)

```python
async def sync_data(wallet_address: str, tokens: dict, data_types: list = None):
    """
    Syncs Gmail, Calendar, Drive, Contacts

    Default data_types: ['gmail', 'calendar', 'drive', 'contacts']

    Returns: List of CIDs for each data type
    """
```

---

## ENVIRONMENT VARIABLES

### Complete Configuration (All Sections)

See `.env.example` for the full template. Below are the critical production variables:

### Database

```bash
DATABASE_URL=postgresql+asyncpg://user:password@host/dbname
REDIS_URL=redis://localhost:6379
```

### AI & LLM

```bash
# Together.ai (Cloud - Recommended)
TOGETHER_API_KEY=your-together-api-key
TOGETHER_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
LLM_PROVIDER=together

# Or Ollama (Local)
# OLLAMA_URL=http://localhost:11434
# OLLAMA_MODEL=mistral
# LLM_PROVIDER=ollama
```

### Storage & IPFS

```bash
# Pinata (Decentralized Storage)
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_KEY=your-pinata-secret
PINATA_JWT=your-pinata-jwt
PINATA_GATEWAY_URL=https://varity.mypinata.cloud  # Use dedicated gateway

# Vector DB
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional-api-key
```

### Varity L3 Blockchain (NEW - December 31, 2025)

```bash
# L3 RPC Configuration
VARITY_L3_RPC=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
VARITY_L3_CHAIN_ID=33529

# L3 Smart Contract for Data Commitments
VARITY_DATA_COMMITMENTS_ADDRESS=0x...  # Deploy and set
VARITY_L3_PRIVATE_KEY=0x...            # Keep SECRET - use Railway secrets

# Network Configuration
VARITY_CHAIN_NAME=Varity L3 Testnet
```

**Deployment Instructions:**

1. Deploy VarityDataCommitments contract to L3
2. Get contract address from deployment receipt
3. Generate private key: `openssl rand -hex 32` → prepend `0x`
4. Set in Railway environment variables (NEVER in .env)
5. Verify connection: `curl https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz` should return `{"jsonrpc":"2.0"}`

### Model Context Protocol (MCP) - NEW

```bash
# MCP Configuration
MCP_SERVERS_ENABLED=true  # Enable MCP data pipeline

# MCP automatically handles OAuth token management for:
# - Google Workspace (@anthropic/google-workspace-mcp)
# - Slack (korotovsky/slack-mcp-server)
# - QuickBooks (@anthropic/quickbooks-online-mcp-server)
# - Microsoft 365 (Softeria/ms-365-mcp-server)
# - Salesforce (Community/MCP-Salesforce)
# - HubSpot (@hubspot/mcp-server)
```

### OAuth Integration Credentials (10 Providers)

```bash
# Google Workspace
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# QuickBooks
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret

# Microsoft 365
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret

# Slack
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Salesforce
SALESFORCE_CLIENT_ID=your-client-id
SALESFORCE_CLIENT_SECRET=your-client-secret

# HubSpot
HUBSPOT_CLIENT_ID=your-client-id
HUBSPOT_CLIENT_SECRET=your-client-secret

# Plus: Shopify, Stripe, Zendesk, Monday.com, Xero
```

### Web Search & External APIs

```bash
# Web Search (One of these)
TAVILY_API_KEY=your-tavily-api-key      # Recommended for LLMs
SERPER_API_KEY=your-serper-api-key      # Alternative

# Embedding/LLM
OPENAI_API_KEY=optional-for-embeddings
```

### Security Settings

```bash
# OAuth State Secret (prevent CSRF)
OAUTH_STATE_SECRET=generate-with-openssl-rand-hex-32

# Encryption Secret (prevent public wallet attacks)
ENCRYPTION_SECRET=generate-with-openssl-rand-hex-32

# Session Security
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=strict
```

### Application Configuration

```bash
APP_NAME=Varity Generic Template Dashboard
ENVIRONMENT=production  # or development
DEBUG=false
LOG_LEVEL=INFO
FRONTEND_URL=https://app.varity.so
CORS_ORIGINS=https://app.varity.so
```

### Production Railway Variables

Set these in Railway dashboard (never in .env):

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
TOGETHER_API_KEY=...
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
PINATA_JWT=...
PINATA_GATEWAY_URL=https://varity.mypinata.cloud
VARITY_L3_RPC=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
VARITY_L3_CHAIN_ID=33529
VARITY_DATA_COMMITMENTS_ADDRESS=0x...
VARITY_L3_PRIVATE_KEY=0x...
OAUTH_STATE_SECRET=...
ENCRYPTION_SECRET=...
ENVIRONMENT=production
```

---

## NEW SERVICES (MCP & L3 BLOCKCHAIN)

### MCP Ingestion Service (`app/services/mcp_ingestion_service.py`)

**Purpose:** Unified pipeline for secure data ingestion from 6 integrations.

**Architecture:**
```
1. MCP Client → Fetch data from integration via MCP
2. Encryption → AES-256-GCM with customer wallet key
3. Routing → Determine destination (RAG/Live/Hybrid)
4. Storage → Upload encrypted to Pinata
5. Indexing → Add to Qdrant (if RAG)
6. L3 Batch → Accumulate for on-chain verification
```

**Data Routing Rules per Integration:**

| Integration | gmail | calendar | drive | contacts | channels | messages |
|-------------|-------|----------|-------|----------|----------|----------|
| Google | LIVE | LIVE | RAG | RAG | - | - |
| Slack | - | - | - | - | LIVE | HYBRID |
| QB | LIVE | LIVE | RAG | RAG | - | - |
| Microsoft | LIVE | LIVE | RAG | RAG | - | - |
| Salesforce | LIVE | - | - | RAG | - | - |
| HubSpot | LIVE | LIVE | - | RAG | - | - |

**LIVE:** Real-time queries (no storage)
**RAG:** Store encrypted in Pinata + index in Qdrant + batch for L3
**HYBRID:** Store initial data + offer live updates

### L3 Data Commitment Service (`app/services/l3_commitment_service.py`)

**Purpose:** On-chain verification of data integrity via Varity L3.

**Features:**
- Merkle tree batch commits (200x cheaper than individual commits)
- CID + content hash verification
- Wallet-attributed data commits
- Block explorer integration

**Configuration:**

```python
L3_CONFIG = {
    "name": "Varity Testnet",
    "chain_id": 33529,
    "rpc_url": "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
    "explorer_url": "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
    "native_token": "USDC",
}
```

**Usage:**

```python
# Single commit (inefficient)
result = await l3_service.commit_single(
    cid="QmXxx...",
    encrypted_content=bytes(...),
    integration="google",
    data_type="drive_files",
    wallet_address="0x..."
)

# Batch commit (recommended - 200x cheaper)
result = await l3_service.commit_batch(
    items=[
        {"cid": "QmXxx", "content": bytes(...)},
        {"cid": "QmYyy", "content": bytes(...)},
    ],
    integration="google",
    wallet_address="0x..."
)
```

**Response:**

```json
{
    "tx_hash": "0x...",
    "merkle_root": "0x...",
    "item_count": 50,
    "l3_committed": true,
    "gas_used": 25000,
    "explorer_url": "https://explorer-varity-testnet.../tx/0x..."
}
```

### MCP Client Wrapper (`mcp_servers/client.py`)

**Purpose:** Async interface to MCP servers for each integration.

**Transport:** JSON-RPC 2.0 over stdio (secure, no network exposure)

**Integration-Specific Data Fetchers:**

```python
# Google Workspace
await fetch_google_data(oauth_token, "drive_files")
await fetch_google_data(oauth_token, "gmail")
await fetch_google_data(oauth_token, "calendar")
await fetch_google_data(oauth_token, "contacts")

# Slack
await fetch_slack_data(oauth_token, "channels")
await fetch_slack_data(oauth_token, "messages")
await fetch_slack_data(oauth_token, "users")

# QuickBooks
await fetch_quickbooks_data(oauth_token, "invoices", realm_id)
await fetch_quickbooks_data(oauth_token, "customers", realm_id)
await fetch_quickbooks_data(oauth_token, "payments", realm_id)

# And more for Microsoft, Salesforce, HubSpot
```

### MCP Server Registry (`mcp_servers/config.py`)

**6 Vetted MCP Servers:**

| Server | Source | Tools | Reliability |
|--------|--------|-------|-------------|
| Google Workspace | @anthropic/google-workspace-mcp | 7 tools | ✅ Official |
| Slack | korotovsky/slack-mcp-server | 5 tools | ✅ Community |
| QuickBooks | @anthropic/quickbooks-online-mcp-server | 5 tools | ✅ Official |
| Microsoft 365 | Softeria/ms-365-mcp-server | 6 tools | ✅ Community |
| Salesforce | Community/MCP-Salesforce | 4 tools | ✅ Community |
| HubSpot | @hubspot/mcp-server | 5 tools | ✅ Official Beta |

---

## MULTI-TENANT SECURITY

### 4-Layer Architecture

| Layer | Implementation |
|-------|----------------|
| **1. Authentication** | Privy → Wallet address |
| **2. Encryption** | PBKDF2 + AES-256-GCM |
| **3. Storage** | Wallet-namespaced Pinata |
| **4. RAG** | Isolated Qdrant collections |

### Security Guarantee

Cross-business data access is **mathematically impossible**:

1. Each wallet derives unique 256-bit key
2. Data encrypted before storage
3. Pinata queries filtered by wallet
4. Qdrant collections isolated per wallet

---

## RECENT FIXES (December 2025)

### Data Sync Optimization

**Problem:** Google data sync took 6+ minutes
**Cause:** Decrypting ALL 60+ Filecoin files sequentially
**Fix:** Added `latest_only=True` parameter

```python
# Before: Returns ALL files for integration
files = await filecoin_service.list_customer_files(wallet, integration)

# After: Returns only 4 files (latest per data_type)
files = await filecoin_service.list_customer_files(wallet, integration, latest_only=True)
```

**Result:** Load time reduced to ~26 seconds

### AI Assistant Endpoints

Fixed endpoint paths called by frontend:

| Before (Wrong) | After (Correct) |
|----------------|-----------------|
| `/api/v1/google/send-email` | `/api/v1/integrations/google/send-email` |
| `/api/v1/microsoft/drive/upload` | `/api/v1/integrations/microsoft/onedrive/upload` |

---

## TESTING ENDPOINTS

### Health Check

```bash
curl https://generic-template-dashboard-production.up.railway.app/health
```

### AI Health

```bash
curl https://generic-template-dashboard-production.up.railway.app/api/v1/ai/health
```

### List Integrations

```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/installed?wallet_address=0x..."
```

### Trigger Sync

```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/sync" \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x..."}'
```

---

## DATABASE MODELS

### Conversation

```python
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    wallet_address = Column(String, index=True)
    title = Column(String(255))
    is_pinned = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    integration = Column(String, nullable=True)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    last_message_at = Column(DateTime)

    messages = relationship("Message", back_populates="conversation")
```

### Message

```python
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String(20))  # 'user', 'assistant', 'system'
    content = Column(Text)
    rag_sources = Column(JSON)
    web_sources = Column(JSON)
    message_metadata = Column(JSON)
    created_at = Column(DateTime)
```

---

## ADAPTER PATTERN

All integration adapters follow this structure:

```python
# adapters/{provider}/sync.py

class ProviderAdapter:
    def __init__(self, access_token: str, refresh_token: str = None):
        self.access_token = access_token
        self.client = httpx.AsyncClient()

    async def sync_data(self, wallet_address: str, data_types: list = None):
        """Fetch and store data from provider"""
        results = []
        for data_type in data_types:
            data = await self.fetch_data(data_type)
            cid = await self.store_encrypted(wallet_address, data_type, data)
            results.append({"data_type": data_type, "cid": cid})
        return results

    async def refresh_tokens(self) -> dict:
        """Refresh expired access token"""
        ...
```

---

## COMMON ISSUES

### QuickBooks Production Configuration

**Status:** Production credentials configured in Railway
**Note:** QuickBooks is NOT in development mode - has full production access

### Pinata NO_SCOPES_FOUND

**Cause:** Using scoped API key
**Fix:** Use admin API key with all permissions

### Token Refresh Failed

**Cause:** Refresh token expired or revoked
**Fix:** User must re-authenticate via OAuth

---

## DEPLOYMENT

### Railway (Production)

All deployments are automatic via GitHub push:

```bash
git push origin main
# Railway auto-deploys in 2-3 minutes
```

### Environment Variables

Set in Railway Dashboard → Variables

### Database Migrations

```bash
# SSH into Railway container or run locally
alembic upgrade head
```

---

## WHEN MAKING CHANGES

### Before

1. Read this file
2. Check `/CLAUDE.md` for context
3. Verify Railway deployment is healthy

### After

1. Test endpoint locally or via Railway logs
2. Check for Python linting errors
3. Commit with descriptive message
4. Push to trigger Railway deploy

### Never

- Expose secrets in code
- Skip error handling
- Modify database schema without migration
- Push directly to main without testing
