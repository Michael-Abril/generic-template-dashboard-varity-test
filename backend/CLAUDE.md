# CLAUDE.md - Backend (FastAPI)

**Last Updated:** December 26, 2025
**Framework:** FastAPI + SQLAlchemy + Pydantic
**Python Version:** 3.8+
**Production:** https://generic-template-dashboard-production.up.railway.app (Railway)

---

## CRITICAL STATUS

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
│   │   ├── together_service.py    # Together.ai LLM
│   │   ├── ollama_service.py      # Ollama fallback
│   │   ├── rag_service.py         # Qdrant + Filecoin
│   │   ├── filecoin_service.py    # Pinata IPFS
│   │   ├── encryption_service.py  # AES-256-GCM
│   │   └── web_search_service.py  # Tavily/Serper
│   │
│   └── models/
│       ├── conversation.py        # Chat models
│       ├── integration.py         # OAuth tokens
│       └── user.py                # User model
│
├── alembic/                       # Migrations
├── requirements.txt               # Dependencies
└── .env                           # Environment vars
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

```bash
# Database
DATABASE_URL=postgresql+asyncpg://...

# AI
TOGETHER_API_KEY=your-together-api-key
TOGETHER_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo

# Storage
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_KEY=your-pinata-secret

# OAuth
FRONTEND_URL=https://app.varity.so
OAUTH_REDIRECT_BASE_URL=https://app.varity.so

# Provider Credentials (All 6 Priority)
QUICKBOOKS_CLIENT_ID=✅
QUICKBOOKS_CLIENT_SECRET=✅
GOOGLE_CLIENT_ID=✅
GOOGLE_CLIENT_SECRET=✅
MICROSOFT_CLIENT_ID=✅
MICROSOFT_CLIENT_SECRET=✅
SLACK_CLIENT_ID=✅
SLACK_CLIENT_SECRET=✅
SALESFORCE_CLIENT_ID=✅
SALESFORCE_CLIENT_SECRET=✅
HUBSPOT_CLIENT_ID=✅
HUBSPOT_CLIENT_SECRET=✅
```

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
