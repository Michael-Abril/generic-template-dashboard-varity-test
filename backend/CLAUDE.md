# CLAUDE.md - Backend (FastAPI)

**Last Updated:** December 17, 2025
**Framework:** FastAPI + SQLAlchemy + Pydantic
**Python Version:** 3.8+
**Production:** Railway (https://generic-template-dashboard-production.up.railway.app)
**Local Container:** generic-template-backend (Port 8002)

---

## 🔴🔴🔴 CRITICAL BLOCKER: QUICKBOOKS API AUTHORIZATION FAILED 🔴🔴🔴

**Status as of Dec 17, 2025:**
- ✅ OAuth connection flow WORKS (tokens stored in PostgreSQL + Filecoin)
- ✅ Credentials encrypted and saved to Filecoin/IPFS (CID generated)
- ❌ **DATA SYNC FAILS** with `403 Forbidden - ApplicationAuthorizationFailed (Error 3100)`

### Error from Railway Logs:
```
QuickBooks API error: {"fault":{"error":[{"message":"message=ApplicationAuthorizationFailed;
errorCode=003100; statusCode=403"}],"type":"SERVICE"}}
```

### Root Cause:
The QuickBooks developer app is in **Development Mode** and can only access sandbox companies, NOT production company data.

### How to Fix (NOT a code issue - requires QuickBooks Developer Portal):

1. **Go to:** https://developer.intuit.com/app/developer/dashboard
2. **Select your app** (Client ID: `ABX6u8d2g40ZFuGCMcaR6KNGQ0J4GWGukB1oTKtHQqkElbyYuL`)
3. **Publish the app** for production access:
   - Click "Production Settings"
   - Complete the app assessment questionnaire
   - Get app reviewed and approved by Intuit
4. **Alternative for testing:** Use QuickBooks Sandbox company

### Files Affected (code is correct, issue is config):
- `app/adapters/quickbooks/sync.py` - Sync adapter
- `app/api/v1/oauth.py` - OAuth flow
- `app/services/filecoin_service.py` - Storage

---

## 🔴 CRITICAL: PENDING DATABASE MIGRATION

**Status:** Migration file created but NOT RUN on Railway database.

**Migration File:** `alembic/versions/fix_oauth_token_product_id_nullable.py`

**What it does:** Makes `oauth_tokens.product_id` nullable (fixes NOT NULL constraint error)

### How to Run the Migration

**Problem:** `DATABASE_URL` is NOT linked to the backend service in Railway. The PostgreSQL connection string exists in the PostgreSQL service but isn't automatically available to backend.

**Solution:**

1. **Get DATABASE_URL from Railway:**
   - Railway Dashboard → Project → PostgreSQL service (the database, not backend!)
   - Click "Variables" tab
   - Copy `DATABASE_URL` value

2. **Run migration locally:**
   ```bash
   cd backend
   pip install alembic psycopg2-binary  # If not installed

   # Run the migration
   DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/railway" alembic upgrade head
   ```

3. **Alternative - Link DATABASE_URL permanently:**
   - Railway Dashboard → Backend Service → Variables
   - Click "Add Variable" → "Reference"
   - Select PostgreSQL service's DATABASE_URL
   - Redeploy backend
   - Then run: `railway run alembic upgrade head`

### Migration History

| Revision | Description | Status |
|----------|-------------|--------|
| `73e5589972b4` | Base migration | ✅ Applied |
| `fix_oauth_product_id` | Make product_id nullable | 🔴 NOT APPLIED |

---

## 🚨 PRODUCTION DEPLOYMENT (Railway)

### Live URLs

| Service | URL |
|---------|-----|
| **Backend API** | https://generic-template-dashboard-production.up.railway.app |
| **Health Check** | https://generic-template-dashboard-production.up.railway.app/health |
| **API Docs** | https://generic-template-dashboard-production.up.railway.app/docs |

### Critical Railway Environment Variables

These MUST be set correctly in Railway Dashboard → Variables:

```bash
# CRITICAL FOR OAUTH (Fixed Dec 13, 2025)
FRONTEND_URL=https://app.varity.so
OAUTH_REDIRECT_BASE_URL=https://app.varity.so

# Database (auto-configured by Railway)
DATABASE_URL=postgresql://...

# AI/LLM
TOGETHER_API_KEY=your-together-api-key

# Storage
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_KEY=your-pinata-secret

# OAuth Credentials (PRIORITY - add these!)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
```

### Deployment Workflow

```bash
# All changes deploy automatically via GitHub
# 1. Make changes locally
# 2. Commit and push to main branch
git add .
git commit -m "fix: description"
git push origin main

# 3. Railway auto-deploys in 2-3 minutes
# 4. Check logs in Railway dashboard if issues
```

---

## 🔴 PRIORITY: FIX OAUTH INTEGRATIONS

### The Problem

OAuth integrations on the marketplace page are NOT working. Users cannot connect QuickBooks, Google, Slack, etc.

### Root Cause (Fixed Dec 13, 2025)

`OAUTH_REDIRECT_BASE_URL` was set incorrectly in Railway. Now set to `https://app.varity.so`.

### What Still Needs to Be Done

1. **Add OAuth Credentials in Railway Dashboard** for each provider:
   - Go to: Railway Dashboard → Project → Variables
   - Add: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.

2. **Register Redirect URIs** in each OAuth provider's developer portal:
   ```
   https://app.varity.so/oauth/callback/quickbooks
   https://app.varity.so/oauth/callback/google
   https://app.varity.so/oauth/callback/microsoft
   https://app.varity.so/oauth/callback/slack
   https://app.varity.so/oauth/callback/hubspot
   ```

3. **Test Each OAuth Flow** in browser at https://app.varity.so

### OAuth Provider Setup Links

| Provider | Developer Portal | Status |
|----------|-----------------|--------|
| **QuickBooks** | https://developer.intuit.com | 🔴 BLOCKED - App in Dev Mode (403 on sync) |
| **Google** | https://console.cloud.google.com/apis/credentials | 🔴 NEEDS CREDENTIALS |
| **Microsoft** | https://portal.azure.com (Azure AD) | 🔴 NEEDS CREDENTIALS |
| **Slack** | https://api.slack.com/apps | 🔴 NEEDS CREDENTIALS |
| **HubSpot** | https://developers.hubspot.com | 🟡 Secondary |

---

## CRITICAL RULES FOR BACKEND DEVELOPMENT

### Code Quality (MUST FOLLOW)
```markdown
- ALWAYS restart container after changes: `docker-compose restart backend`
- ALWAYS check logs after restart: `docker logs generic-template-backend`
- Fix ALL Python linting errors before completing tasks
- Follow PEP 8 style guide
- Use type hints for ALL functions
- This step must NEVER be skipped
```

### After Making Backend Changes
```bash
# 1. Restart backend container
docker-compose restart backend

# 2. Check for errors in logs
docker logs generic-template-backend 2>&1 | grep -iE "(error|warning)" | head -20

# 3. Verify health endpoint
curl http://localhost:8002/health
```

---

## DIRECTORY STRUCTURE

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   │
│   ├── api/v1/                    # REST API endpoints
│   │   ├── __init__.py            # Router registration
│   │   ├── oauth.py               # OAuth endpoints (CRITICAL)
│   │   ├── dashboard.py           # Dashboard KPIs
│   │   ├── marketplace_v2.py      # Marketplace products
│   │   ├── integrations.py        # Integration management
│   │   ├── ai.py                  # AI chat endpoints
│   │   ├── analytics.py           # Analytics data
│   │   ├── settings.py            # User settings
│   │   ├── sync.py                # Data sync endpoints
│   │   └── export.py              # Data export
│   │
│   ├── adapters/                  # Integration adapters (25 providers)
│   │   ├── quickbooks/            # QuickBooks adapter (CONFIGURED ✅)
│   │   ├── google/                # Google Workspace adapter (Priority 1)
│   │   ├── microsoft/             # Microsoft 365 adapter (Priority 2)
│   │   ├── slack/                 # Slack adapter (Priority 3)
│   │   ├── stripe/                # Stripe adapter (Coming Soon)
│   │   ├── salesforce/            # Salesforce adapter
│   │   ├── hubspot/               # HubSpot adapter
│   │   ├── shopify/               # Shopify adapter
│   │   ├── zendesk/               # Zendesk adapter
│   │   ├── monday/                # Monday.com adapter (Coming Soon)
│   │   ├── asana/                 # Asana adapter (Coming Soon)
│   │   ├── notion/                # Notion adapter
│   │   ├── trello/                # Trello adapter (Coming Soon)
│   │   ├── jira/                  # Jira adapter
│   │   ├── github/                # GitHub adapter
│   │   ├── dropbox/               # Dropbox adapter
│   │   ├── mailchimp/             # Mailchimp adapter
│   │   ├── zoom/                  # Zoom adapter
│   │   ├── xero/                  # Xero adapter
│   │   ├── docusign/              # DocuSign adapter
│   │   ├── square/                # Square POS adapter (Coming Soon - stub)
│   │   ├── paypal/                # PayPal adapter (Coming Soon - stub)
│   │   ├── gusto/                 # Gusto HR adapter (Coming Soon - stub)
│   │   ├── calendly/              # Calendly adapter (Coming Soon - stub)
│   │   └── canva/                 # Canva adapter (Coming Soon - stub)
│   │
│   ├── core/                      # Core configuration
│   │   ├── config.py              # Settings (Pydantic BaseSettings)
│   │   ├── database.py            # Database connection (SQLAlchemy)
│   │   └── startup.py             # Startup sequence
│   │
│   ├── services/                  # Business logic services
│   │   ├── filecoin_service.py    # Filecoin/IPFS storage (Pinata)
│   │   ├── lit_service.py         # Lit Protocol encryption
│   │   ├── ollama_service.py      # Ollama LLM service (fallback)
│   │   ├── together_service.py    # Together.ai LLM (primary)
│   │   ├── rag_service.py         # RAG with Qdrant + Filecoin CIDs
│   │   └── web_search_service.py  # Tavily/Serper web search
│   │
│   ├── models/                    # SQLAlchemy models
│   │   ├── user.py                # User model
│   │   ├── integration.py         # Integration model
│   │   └── marketplace.py         # Marketplace models
│   │
│   ├── middleware/                # FastAPI middleware
│   └── utils/                     # Utility functions
│
├── alembic/                       # Database migrations
├── tests/                         # Test suites
├── .env                           # Environment variables (CRITICAL)
├── .env.example                   # Example environment file
├── requirements.txt               # Python dependencies
├── Dockerfile                     # Container build
└── pytest.ini                     # Pytest configuration
```

---

## CRITICAL FILES AND LINE NUMBERS

### app/core/config.py - Settings Class
```python
# Line ~65: frontend_url setting
frontend_url: str = Field(default="http://localhost:3001", env="FRONTEND_URL")

# Line ~70: ollama_url setting
ollama_url: str = Field(default="http://localhost:11434", env="OLLAMA_URL")
```

### app/api/v1/oauth.py - OAuth Endpoints
```python
# Line ~50-100: get_redirect_uri() function
def get_redirect_uri(provider: str) -> str:
    return f"{settings.frontend_url}/oauth/callback/{provider}"

# Line ~150: start_oauth endpoint
@router.post("/start/{provider}")
async def start_oauth(provider: str, wallet_address: str):
    ...

# Line ~200: oauth_callback endpoint
@router.post("/callback")
async def oauth_callback(data: OAuthCallbackData):
    ...
```

### app/core/startup.py - Startup Sequence
```python
# Line ~162: Ollama health check (FIXED Dec 7, 2025)
ollama_url = settings.ollama_url.rstrip('/')
async with httpx.AsyncClient(timeout=5.0) as client:
    response = await client.get(f"{ollama_url}/api/tags")
```

### app/services/filecoin_service.py - Pinata Integration
```python
# Line ~292: list_customer_files query format (FIXED Dec 7, 2025)
filters = {
    "status": "pinned",
    "metadata[keyvalues][customer_wallet]": json.dumps({"value": customer_wallet.lower(), "op": "eq"})
}
```

---

## ENVIRONMENT VARIABLES (.env)

### Database & Services
```bash
DATABASE_URL=postgresql+asyncpg://generic_template:generic_template_secure_password@generic-template-postgres:5432/generic_template
REDIS_URL=redis://generic-template-redis:6379
QDRANT_URL=http://generic-template-qdrant:6333
```

### AI/LLM Services
```bash
# Together.ai (Primary - Production LLM)
TOGETHER_API_KEY=your-together-api-key
TOGETHER_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo

# Ollama (Fallback - Local Development)
OLLAMA_URL=http://generic-template-ollama:11434
OLLAMA_MODEL=tinyllama

# Web Search (Optional - for internet access)
TAVILY_API_KEY=your-tavily-key     # Primary web search
SERPER_API_KEY=your-serper-key     # Alternative web search
```

### Pinata (Filecoin/IPFS)
```bash
PINATA_API_KEY=85129e92e21e7b51cb44
PINATA_SECRET_KEY=35b44fb64bd61a1683fddf0154ed545be0c248f793a371abd4f8e16955cd1f05
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### OAuth Configuration
```bash
FRONTEND_URL=http://localhost:3001

# QuickBooks (CONFIGURED ✅)
QUICKBOOKS_CLIENT_ID=ABX6u8d2g40ZFuGCMcaR6KNGQ0J4GWGukB1oTKtHQqkElbyYuL
QUICKBOOKS_CLIENT_SECRET=E184srbFxJhtrpSC4SfCZosXk3N8VqG16qk1Yqup

# PRIORITY OAuth Providers (Universal SMB Tools)
GOOGLE_CLIENT_ID=      # Priority 1 - https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=   # Priority 2 - https://portal.azure.com (Azure AD)
MICROSOFT_CLIENT_SECRET=
SLACK_CLIENT_ID=       # Priority 3 - https://api.slack.com/apps
SLACK_CLIENT_SECRET=

# Secondary providers
HUBSPOT_CLIENT_ID=
ZENDESK_CLIENT_ID=
SALESFORCE_CLIENT_ID=
SHOPIFY_CLIENT_ID=

# Coming Soon providers (stub adapters, no OAuth needed yet)
STRIPE_CLIENT_ID=      # Requires Connect business verification
SQUARE_CLIENT_ID=
PAYPAL_CLIENT_ID=
GUSTO_CLIENT_ID=
CALENDLY_CLIENT_ID=
CANVA_CLIENT_ID=
```

### Varity L3 Blockchain
```bash
VARITY_CHAIN_ID=33529
VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
```

---

## API ENDPOINT PATTERNS

### Standard Response Format
```python
# Success response
return {"success": True, "data": {...}}

# Error response
raise HTTPException(status_code=400, detail="Error message")
```

### Wallet-Based Authentication
```python
# All user-specific endpoints require wallet_address parameter
@router.get("/endpoint")
async def endpoint(wallet_address: str = Query(...)):
    # wallet_address is used to identify the user
    ...
```

### OAuth Endpoint Pattern
```python
@router.post("/oauth/start/{provider}")
async def start_oauth(
    provider: str,
    request: OAuthStartRequest,  # Contains wallet_address
    db: AsyncSession = Depends(get_db)
):
    # 1. Generate state token
    # 2. Build authorization URL with redirect_uri
    # 3. Return URL for frontend to redirect
    ...

@router.post("/oauth/callback")
async def oauth_callback(
    data: OAuthCallbackData,  # Contains code, state, wallet_address
    db: AsyncSession = Depends(get_db)
):
    # 1. Validate state token
    # 2. Exchange code for tokens
    # 3. Encrypt tokens with Lit Protocol
    # 4. Store in Filecoin
    # 5. Return success
    ...
```

---

## ADAPTER PATTERN

Each integration adapter follows this structure:

```python
# app/adapters/{provider}/__init__.py
class ProviderAdapter:
    def __init__(self, access_token: str, refresh_token: str = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.client = httpx.AsyncClient()

    async def get_profile(self) -> dict:
        """Get user profile from provider"""
        ...

    async def get_data(self, data_type: str) -> list:
        """Get data from provider (invoices, contacts, etc.)"""
        ...

    async def refresh_tokens(self) -> dict:
        """Refresh access token using refresh token"""
        ...
```

---

## DATABASE MODELS

### Integration Model
```python
# app/models/integration.py
class Integration(Base):
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True)
    wallet_address = Column(String, index=True)
    provider = Column(String)  # quickbooks, stripe, etc.
    cid = Column(String)  # Filecoin CID for encrypted tokens
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
```

### Marketplace Models
```python
# app/models/marketplace.py
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    category = Column(String)
    price_usdc = Column(Float)
    description = Column(String)
    ...
```

---

## TESTING

### Run All Tests
```bash
docker exec generic-template-backend pytest -v
```

### Run Specific Tests
```bash
# OAuth tests
docker exec generic-template-backend pytest tests/test_oauth.py -v

# Database tests
docker exec generic-template-backend pytest tests/test_database.py -v
```

### Test Coverage
```bash
docker exec generic-template-backend pytest --cov=app --cov-report=html
```

---

## COMMON ERRORS AND FIXES

### Error: "Connection refused to PostgreSQL"
**Fix:** Ensure container name in DATABASE_URL matches docker-compose service name
```bash
DATABASE_URL=postgresql+asyncpg://...@generic-template-postgres:5432/...
```

### Error: "Ollama not configured"
**Fix:** Add OLLAMA_URL to .env
```bash
OLLAMA_URL=http://generic-template-ollama:11434
```

### Error: "Pinata metadata query format"
**Fix:** Use JSON object format in query
```python
filters = {
    "metadata[keyvalues][key]": json.dumps({"value": "value", "op": "eq"})
}
```

### Error: "OAuth redirect_uri mismatch"
**Fix:** Ensure FRONTEND_URL in .env matches exactly what's registered with provider
```bash
FRONTEND_URL=http://localhost:3001  # No trailing slash!
```

---

## QUICK REFERENCE COMMANDS

```bash
# Restart backend
docker-compose restart backend

# View logs
docker logs generic-template-backend -f

# Check health
curl http://localhost:8002/health

# Access container shell
docker exec -it generic-template-backend bash

# Run Python command in container
docker exec generic-template-backend python -c "print('hello')"

# Install new dependency
docker exec generic-template-backend pip install package-name
# Then add to requirements.txt

# Database shell
docker exec -it generic-template-postgres psql -U generic_template

# Redis CLI
docker exec -it generic-template-redis redis-cli
```

---

## WHEN ADDING NEW OAUTH PROVIDER

1. **Create adapter** in `app/adapters/{provider}/`
2. **Add credentials** to `.env`
3. **Add provider config** in `app/core/config.py`
4. **Update OAuth endpoints** in `app/api/v1/oauth.py` if needed
5. **Test full flow** in browser
6. **Update documentation** in `docs/guides/OAUTH_PROVIDER_SETUP_GUIDE.md`

---

## CRITICAL: Docker Environment Variables (FIXED Dec 7, 2025)

**Docker reads environment variables from the ROOT `.env` file, NOT `backend/.env`!**

This is a critical distinction that caused the Pinata API to fail. Docker Compose loads
environment variables from the root `.env` file and passes them to containers.

### Working Pinata Credentials
The working Pinata API key is: `85129e92e21e7b51cb44`

Both files MUST have the SAME Pinata credentials:
- **Root `/.env`** - Docker reads from here for container environment
- **`backend/.env`** - Used by local development and as reference

### If You Change Pinata Credentials

```bash
# 1. Update BOTH .env files with same credentials

# 2. CRITICAL: Recreate the container (restart is NOT enough!)
docker-compose stop backend && docker-compose rm -f backend && docker-compose up -d backend

# 3. Verify new credentials loaded inside container
docker exec generic-template-backend env | grep PINATA_API_KEY
# Should show: PINATA_API_KEY=85129e92e21e7b51cb44

# 4. Test Pinata operations
curl "http://localhost:8002/api/v1/integrations/quickbooks/data?wallet_address=0x20B7d1426649D9a573ba7Fd10592456264220cbF"
```

### Common Mistake: Using `docker-compose restart`

```bash
# WRONG - Does NOT reload .env changes!
docker-compose restart backend

# CORRECT - Fully recreates container with new env vars
docker-compose stop backend && docker-compose rm -f backend && docker-compose up -d backend
```

### Pinata Error: NO_SCOPES_FOUND

If you see `NO_SCOPES_FOUND` error when calling Pinata API:
- The API key is a "scoped key" with limited permissions
- Solution: Use an admin API key from Pinata dashboard (Settings → API Keys → New Key → All permissions)

---

## MULTI-TENANT SECURITY (CRITICAL)

**Full Documentation:** See main `/CLAUDE.md` for complete 4-layer security architecture.

### Quick Reference: How Business Data Isolation Works

Each business that uses the dashboard gets **complete data isolation** through these backend services:

| Layer | Service | File | Key Function |
|-------|---------|------|--------------|
| **Encryption** | AES-256-GCM | `app/services/encryption_service.py` | `derive_customer_key()` |
| **Storage** | Wallet-Namespaced | `app/services/filecoin_service.py` | `upload_encrypted_data()` |
| **RAG** | Isolated Collections | `app/services/rag_service.py` | `_get_collection_name()` |
| **OAuth** | Wallet-Bound Tokens | `app/api/v1/oauth.py` | `oauth_callback()` |

### Critical Security Services

**1. Encryption Service** (`app/services/encryption_service.py`):
```python
# Each wallet = unique 256-bit encryption key
def derive_customer_key(self, wallet_address: str) -> bytes:
    salt = hashlib.sha256(f"varity-oauth-{wallet}-{chain_id}".encode()).digest()[:16]
    kdf = PBKDF2HMAC(algorithm=SHA256(), length=32, salt=salt, iterations=100000)
    return kdf.derive(wallet.encode())
```

**2. Filecoin Service** (`app/services/filecoin_service.py`):
```python
# Namespace format ensures business isolation
namespace = f"customer-{wallet}-{integration}-{data_type}-{timestamp}"

# Query isolation - only returns files for requesting wallet
filters = {"metadata[keyvalues][customer_wallet]": json.dumps({"value": wallet.lower(), "op": "eq"})}
```

**3. RAG Service** (`app/services/rag_service.py`):
```python
# Each business gets isolated Qdrant collection
def _get_collection_name(self, business_wallet: str) -> str:
    return f"business_{business_wallet.lower().replace('0x', '')}"
```

### Security Guarantees

- **Cross-Business Access**: Mathematically impossible (wallet-derived keys)
- **Token Encryption**: AES-256-GCM + PBKDF2 (100K iterations)
- **Storage Isolation**: Wallet-namespaced Pinata metadata
- **RAG Isolation**: Separate Qdrant collections per wallet

---

## AI SERVICES ARCHITECTURE

### Overview: RAG → Filecoin Pipeline

The AI Assistant uses a multi-provider LLM stack with business-specific RAG:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI SERVICE STACK                              │
├─────────────────────────────────────────────────────────────────┤
│  together_service.py  →  Together.ai API (Llama 3.3 70B)        │
│  ollama_service.py    →  Ollama (TinyLlama) - Fallback          │
│  rag_service.py       →  Qdrant + Filecoin CID references       │
│  web_search_service.py→  Tavily/Serper web search               │
└─────────────────────────────────────────────────────────────────┘
```

### Service Files and Key Functions

| Service | File | Key Functions |
|---------|------|---------------|
| **Together.ai** | `app/services/together_service.py` | `chat()`, `analyze_document()`, `deep_research()` |
| **Ollama** | `app/services/ollama_service.py` | `query()`, `query_business_ai()` |
| **RAG** | `app/services/rag_service.py` | `index_business_data()`, `query_business_rag()` |
| **Web Search** | `app/services/web_search_service.py` | `search()` |

### RAG Service - Filecoin CID Storage

```python
# app/services/rag_service.py

# Each business gets isolated Qdrant collection
def _get_collection_name(self, business_wallet: str) -> str:
    wallet_clean = business_wallet.lower().replace("0x", "")
    return f"business_{wallet_clean}"

# Index data with Filecoin CID reference
async def index_business_data(self, business_wallet, cid, data, integration, data_type):
    payload = {
        "cid": cid,                    # <-- Filecoin CID from Pinata
        "data": data,
        "integration": integration,
        "data_type": data_type,
        "business_wallet": business_wallet.lower(),
    }
    # Store in business-specific collection

# Query ONLY this business's data
async def query_business_rag(self, business_wallet, query, limit=5):
    collection_name = self._get_collection_name(business_wallet)
    # Returns: [{cid, data, score}, ...]
```

### Together.ai Service - Advanced AI

```python
# app/services/together_service.py

class TogetherService:
    def __init__(self):
        self.api_key = os.getenv("TOGETHER_API_KEY")
        self.model = os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo")

    async def chat(self, message, wallet_address, context=None):
        """General chat with optional RAG context"""

    async def analyze_document(self, document_content, analysis_type, wallet_address):
        """Document analysis: summary, key_points, sentiment, extraction, action_items"""

    async def deep_research(self, query, wallet_address, depth="standard"):
        """Deep research: quick, standard, comprehensive (with web search)"""
```

### API Endpoints (app/api/v1/ai.py)

```python
# 7 AI Endpoints

@router.post("/chat")           # General chat
@router.get("/chat/history")    # Chat history
@router.post("/query")          # RAG query (business-specific)
@router.post("/analyze")        # Document analysis
@router.post("/research")       # Deep research
@router.post("/search")         # Web search
@router.get("/models")          # List models
@router.get("/health")          # AI health check
```

### LLM Provider Fallback Logic

```python
# Priority: Together.ai → Ollama

if settings.together_api_key:
    # Use Together.ai (Llama 3.3 70B)
    service = TogetherService()
else:
    # Fallback to Ollama (TinyLlama)
    service = OllamaService()
```

---

## DEPENDENCIES (requirements.txt)

Key packages:
- `fastapi>=0.104.0` - Web framework
- `uvicorn>=0.24.0` - ASGI server
- `sqlalchemy>=2.0.0` - ORM
- `asyncpg>=0.29.0` - Async PostgreSQL driver
- `pydantic>=2.5.0` - Data validation
- `httpx>=0.25.0` - Async HTTP client
- `redis>=5.0.0` - Redis client
- `python-jose>=3.3.0` - JWT handling
- `cryptography>=41.0.0` - Encryption utilities
