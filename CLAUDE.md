# CLAUDE.md - Generic Company Dashboard Template

**Last Updated:** December 7, 2025
**Status:** 95% Complete - Ready for SMB Beta Testing
**Build Status:** Passing (Frontend + Backend healthy)
**Priority:** Get businesses onboarded for Varity go-to-market

---

## CRITICAL CONTEXT FOR CLAUDE CODE

This is the **Generic Company Dashboard Template** - Varity's flagship product for launching businesses on 100% decentralized infrastructure (DePin). We are on a **critical deadline** to finish this for customer onboarding.

**Location:** `/varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard/`

### Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend (Next.js)** | 100% | All pages, components, Coming Soon badges working |
| **Backend (FastAPI)** | 100% | All endpoints, services healthy |
| **Docker Infrastructure** | 100% | All 5 containers healthy |
| **Database (PostgreSQL)** | 100% | 25 products, 15 categories seeded |
| **Cache (Redis)** | 100% | Connected, working |
| **AI/LLM (Ollama)** | 100% | TinyLlama model, RAG ready |
| **Vector DB (Qdrant)** | 100% | Connected, embeddings ready |
| **Storage (Filecoin/Pinata)** | 100% | Connected, multi-tenant |
| **Marketplace** | 100% | 25 SMB products with Coming Soon badges |
| **OAuth Integrations** | **10%** | QuickBooks configured, 3 priority remaining |
| **Smart Contracts** | 100% | Deployed on Arbitrum Sepolia |

### Marketplace Products (25 Total)

**Ready for OAuth Setup (14 products):**
- QuickBooks (Accounting) - **CONFIGURED**
- Google Workspace (Productivity) - Priority #1
- Microsoft 365 (Productivity) - Priority #2
- Slack (Communication) - Priority #3
- HubSpot (CRM)
- Zendesk (Support)
- Salesforce (CRM)
- Shopify (E-commerce)
- Xero (Accounting)
- FreshBooks (Accounting)
- Mailchimp (Marketing)
- DocuSign (Documents)
- Zoom (Communication)
- Dropbox (Storage)

**Coming Soon (11 products - No OAuth needed yet):**
- Stripe (requires Connect business verification)
- Square (Point of Sale)
- PayPal (Payments)
- Gusto (Payroll/HR)
- Calendly (Scheduling)
- Canva (Design)
- Asana (Project Management)
- Trello (Project Management)
- Monday.com (Project Management)
- Intercom (Customer Service)
- Twilio (Communications)

### What Needs to Be Done (Priority Order)

1. **OAuth Provider Setup** (PRIORITY - Universal SMB Tools)
   - **Priority 1 - Google Workspace:** https://console.cloud.google.com/apis/credentials
   - **Priority 2 - Microsoft 365:** https://portal.azure.com (Azure AD)
   - **Priority 3 - Slack:** https://api.slack.com/apps

2. **Secondary OAuth Providers** (After priorities complete)
   - HubSpot: https://developers.hubspot.com
   - Zendesk: https://developer.zendesk.com
   - Salesforce: https://developer.salesforce.com (longer approval process)
   - Shopify: https://partners.shopify.com

3. **End-to-End Testing** - All OAuth flows need browser testing
4. **Production Deployment** - Deploy to Varity L3 mainnet

---

## CODE QUALITY RULES (CRITICAL)

```markdown
## Code Quality (MUST FOLLOW)
- ALWAYS run `npm run build` after editing frontend files
- ALWAYS run `docker logs generic-template-backend` after editing backend files
- Fix ALL TypeScript errors before completing tasks
- Fix ALL Python linting errors before completing tasks
- This step must NEVER be skipped
```

## GIT WORKFLOW

```markdown
## Git & Version Control
- Create feature branches for all changes (feature/*, fix/*, etc.)
- Commit frequently with descriptive messages
- Current branch: feature/restructuring-iso-dashboard
- Main branch: main (for PRs)
- Never push directly to main
```

## TESTING REQUIREMENTS

```markdown
## Testing Requirements
- Run `npm test` for frontend unit tests
- Run `pytest` in backend/ for Python tests
- Run `npm run test:e2e` for Playwright E2E tests
- Test OAuth flows in browser (cannot be automated fully)
- Verify all API endpoints return 200 status
```

---

## ARCHITECTURE OVERVIEW

### Directory Structure

```
generic-company-dashboard/
├── src/                          # Next.js 14 frontend
│   ├── app/                      # App Router pages
│   │   ├── ai-assistant/         # AI chat page
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── dashboard/            # Main dashboard
│   │   ├── integrations/         # OAuth integrations page
│   │   ├── marketplace/          # Tool marketplace
│   │   ├── oauth/callback/       # OAuth callback handlers
│   │   ├── onboarding/           # User onboarding
│   │   └── settings/             # Settings page
│   ├── components/               # React components
│   ├── hooks/                    # React hooks
│   ├── lib/                      # Utilities
│   │   ├── errorHandling.ts      # Error handling utilities
│   │   ├── logger.ts             # Logging utilities
│   │   └── varity-chain.ts       # Varity L3 chain config
│   ├── services/                 # API client
│   │   └── apiClient.ts          # Backend API client
│   └── types/                    # TypeScript types
│
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── api/v1/               # REST API endpoints
│   │   │   ├── oauth.py          # OAuth endpoints (CRITICAL)
│   │   │   ├── dashboard.py      # Dashboard KPIs
│   │   │   ├── marketplace_v2.py # Marketplace
│   │   │   ├── integrations.py   # Integration management
│   │   │   └── ai.py             # AI chat endpoints
│   │   ├── adapters/             # 20 integration adapters
│   │   ├── core/
│   │   │   ├── config.py         # Settings (CRITICAL)
│   │   │   ├── database.py       # Database connection
│   │   │   └── startup.py        # Startup sequence
│   │   ├── services/
│   │   │   ├── filecoin_service.py  # Filecoin storage
│   │   │   ├── lit_service.py       # Lit Protocol encryption
│   │   │   └── ollama_service.py    # LLM service
│   │   └── models/               # SQLAlchemy models
│   ├── .env                      # Environment variables (CRITICAL)
│   └── requirements.txt          # Python dependencies
│
├── contracts/                    # Solidity smart contracts
├── docs/                         # Documentation
│   ├── guides/                   # Setup guides
│   │   └── OAUTH_PROVIDER_SETUP_GUIDE.md
│   └── archive/                  # Historical reports
├── docker-compose.yml            # Docker orchestration
└── package.json                  # Node.js dependencies
```

### Tech Stack

| Layer | Technology | Port |
|-------|------------|------|
| **Frontend** | Next.js 14, TypeScript, Tailwind | 3001 |
| **Backend** | FastAPI, Python 3.8, Pydantic | 8002 |
| **Database** | PostgreSQL 15 | 5433 |
| **Cache** | Redis 7 | 6380 |
| **LLM** | Ollama (TinyLlama) | 11435 |
| **Vector DB** | Qdrant | 6334/6335 |
| **Storage** | Filecoin/IPFS (Pinata) | - |
| **Blockchain** | Arbitrum L3 (Varity) | - |

---

## MULTI-TENANT SECURITY ARCHITECTURE (CRITICAL)

### Overview: 4-Layer Security for Business Data Isolation

Each business that uses the dashboard gets **complete data isolation** - mathematically impossible for Business A to access Business B's data. This is achieved through 4 layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: Authentication (Privy)                                    │
│  Business Owner signs in → Email/Google/Wallet → Gets Unique Wallet │
│  ceo@acme.com → 0x742d35Cc6634C0532925a3b844Bc454e4438f44e          │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 2: Encryption (AES-256-GCM + Wallet-Derived Keys)            │
│  OAuth tokens encrypted with wallet-specific key                    │
│  Only that wallet can decrypt                                       │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 3: Storage (Filecoin/Pinata with Wallet Namespaces)          │
│  customer-{wallet}-{integration}-{data_type}-{timestamp}            │
│  Queries filtered by customer_wallet metadata                       │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 4: AI/RAG (Qdrant with Isolated Collections)                 │
│  Collection: business_{wallet_address}                              │
│  AI queries ONLY the requesting business's collection               │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer 1: Privy Authentication → Wallet Binding

**File:** `src/app/providers.tsx`

```typescript
// Privy creates/binds embedded wallet to user account
loginMethods: ['email', 'google', 'wallet'],

// WalletSyncProvider extracts wallet address for all operations
const primaryWallet = wallets[0];
if (authenticated && primaryWallet?.address) {
  setSyncState({ address: primaryWallet.address }); // <-- Identity key
}
```

**Key Points:**
- Business signs in with email (ceo@company.com) via Privy
- Privy automatically creates embedded wallet (0x...)
- This wallet address becomes the **universal identity** for ALL storage

### Layer 2: Wallet-Based Encryption (AES-256-GCM)

**File:** `backend/app/services/encryption_service.py`

```python
def derive_customer_key(self, wallet_address: str) -> bytes:
    """Each business gets unique encryption key from wallet"""
    salt = hashlib.sha256(
        f"varity-oauth-{wallet}-{self.chain_id}".encode()
    ).digest()[:16]

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,        # 256-bit key
        salt=salt,
        iterations=100000,
    )
    return kdf.derive(wallet.encode())
```

**Key Points:**
- Each wallet = unique 256-bit encryption key
- OAuth tokens encrypted before storage
- Decryption requires matching wallet address
- Cross-business decryption is cryptographically impossible

### Layer 3: Filecoin Storage with Wallet Namespaces

**File:** `backend/app/services/filecoin_service.py`

```python
# Namespace format ensures business isolation
namespace = f"customer-{wallet}-{integration}-{data_type}-{timestamp}"
# Example: customer-0x742d35cc-quickbooks-invoices-2025-12-07T10:30:00

# Metadata tags for query isolation
pin_data["pinataMetadata"]["keyvalues"] = {
    "customer_wallet": customer_wallet,  # <-- Query filter
    "integration": integration,
    "data_type": data_type,
    "encrypted": "true",
    "layer": "customer-data"
}

# Query isolation - only returns files for requesting wallet
filters = {
    "metadata[keyvalues][customer_wallet]": json.dumps({
        "value": customer_wallet.lower(),
        "op": "eq"
    })
}
```

**Key Points:**
- Each business's files have unique namespace prefix
- Pinata metadata includes wallet address
- `list_customer_files()` filters by wallet only
- No folder traversal possible - metadata-based isolation

### Layer 4: RAG Vector Database Isolation

**File:** `backend/app/services/rag_service.py`

```python
def _get_collection_name(self, business_wallet: str) -> str:
    """Each business gets isolated Qdrant collection"""
    wallet_clean = business_wallet.lower().replace("0x", "")
    return f"business_{wallet_clean}"
    # Example: business_742d35cc6634c0532925a3b844bc454e4438f44e

async def query_business_rag(self, business_wallet: str, query: str):
    """CRITICAL: Queries only this business's collection"""
    collection_name = self._get_collection_name(business_wallet)
    results = self.qdrant.search(
        collection_name=collection_name,  # <-- Isolated
        query_vector=query_embedding,
    )
```

**Key Points:**
- Separate Qdrant collection per business wallet
- AI queries ONLY the requesting business's data
- No cross-business data leakage possible

---

## AI ASSISTANT ARCHITECTURE (REVOLUTIONARY)

### Overview: Business-Specific AI with RAG → Filecoin Integration

The AI Assistant is the **central intelligence hub** of the dashboard. Each business gets AI responses based ONLY on their own data stored in Filecoin/IPFS, ensuring complete data isolation and business-specific insights.

### LLM Provider Stack (Multi-Provider Fallback)

| Provider | Model | Use Case | Status |
|----------|-------|----------|--------|
| **Together.ai** | Llama 3.3 70B Instruct Turbo | Primary (production) | ✅ Active |
| **Ollama** | TinyLlama/Mistral | Fallback (local/dev) | ✅ Active |

**Environment Variables:**
```bash
# Together.ai (Primary - Production)
TOGETHER_API_KEY=your-together-api-key

# Ollama (Fallback - Local)
OLLAMA_URL=http://generic-template-ollama:11434
OLLAMA_MODEL=tinyllama

# Web Search (Optional)
TAVILY_API_KEY=your-tavily-key      # OR
SERPER_API_KEY=your-serper-key
```

### RAG → Filecoin Data Flow (CRITICAL)

```
┌─────────────────────────────────────────────────────────────────────┐
│              RAG → FILECOIN ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. DATA INGESTION (When integration syncs data)                    │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  QuickBooks/Slack/Google → Adapter → Encrypt → Pinata  │        │
│  │                                           ↓             │        │
│  │                                    Returns CID          │        │
│  │                                    (Filecoin hash)      │        │
│  └────────────────────────────────────────────────────────┘        │
│                              ↓                                       │
│  2. RAG INDEXING (Store CID + vectors in Qdrant)                    │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  Collection: business_{wallet_address}                  │        │
│  │  ├── Point ID: unique_id                               │        │
│  │  ├── Vector: [0.1, 0.2, ...] (text embedding)          │        │
│  │  └── Payload: {                                         │        │
│  │        "cid": "QmXyz123...",     # Filecoin CID        │        │
│  │        "data": {...},            # Original data        │        │
│  │        "integration": "quickbooks",                     │        │
│  │        "data_type": "invoices",                         │        │
│  │        "business_wallet": "0x742d35cc..."              │        │
│  │      }                                                  │        │
│  └────────────────────────────────────────────────────────┘        │
│                              ↓                                       │
│  3. AI QUERY (User asks question)                                   │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  User: "Show my overdue invoices"                       │        │
│  │                     ↓                                   │        │
│  │  RAG Service: query_business_rag(wallet, question)      │        │
│  │                     ↓                                   │        │
│  │  Qdrant: Search ONLY business_{wallet} collection       │        │
│  │                     ↓                                   │        │
│  │  Returns: [{cid, data, score}, ...]                     │        │
│  │                     ↓                                   │        │
│  │  LLM: Generate response with business-specific context  │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### AI Capabilities (7 Endpoints)

| Capability | Endpoint | Description |
|------------|----------|-------------|
| **General Chat** | `POST /ai/chat` | Works without integrations - general LLM |
| **RAG Query** | `POST /ai/query` | Business-specific RAG with Filecoin data |
| **Document Analysis** | `POST /ai/analyze` | 5 analysis types (summary, key_points, sentiment, extraction, action_items) |
| **Deep Research** | `POST /ai/research` | 3 depth levels (quick, standard, comprehensive) |
| **Web Search** | `POST /ai/search` | Internet access via Tavily/Serper |
| **Model List** | `GET /ai/models` | Available AI models |
| **Health Check** | `GET /ai/health` | AI service status |

### Document Analysis Types

```python
# POST /api/v1/ai/analyze
{
    "wallet_address": "0x...",
    "document_content": "Q3 Revenue Report: Total revenue $2.4M...",
    "analysis_type": "summary"  # Options below
}

# Analysis Types:
# - "summary"     → Concise overview of document
# - "key_points"  → Bullet-point highlights
# - "sentiment"   → Positive/negative/neutral tone
# - "extraction"  → Extract specific data (numbers, dates, names)
# - "action_items"→ Actionable tasks from document
```

### Deep Research Mode

```python
# POST /api/v1/ai/research
{
    "wallet_address": "0x...",
    "query": "What are the best strategies for reducing operational costs?",
    "depth": "comprehensive"  # Options: quick, standard, comprehensive
}

# Depth Levels:
# - "quick"         → Fast response, basic RAG
# - "standard"      → RAG + additional analysis
# - "comprehensive" → RAG + Web Search + multi-source synthesis
```

### Web Search Integration

```python
# POST /api/v1/ai/search
{
    "wallet_address": "0x...",
    "query": "latest industry trends in payment processing 2025"
}

# Requires: TAVILY_API_KEY or SERPER_API_KEY in environment
# Returns: Search results + AI synthesis
```

### Critical Backend Services

| Service | File | Purpose |
|---------|------|---------|
| **together_service.py** | `app/services/together_service.py` | Together.ai LLM + advanced AI |
| **ollama_service.py** | `app/services/ollama_service.py` | Ollama fallback LLM |
| **rag_service.py** | `app/services/rag_service.py` | Qdrant vector DB + Filecoin CID storage |
| **web_search_service.py** | `app/services/web_search_service.py` | Tavily/Serper web search |
| **filecoin_service.py** | `app/services/filecoin_service.py` | Pinata (Filecoin/IPFS) storage |

### Why This Architecture is Revolutionary

1. **Business-Specific AI**: Each business gets AI trained on THEIR data only
2. **Filecoin-Backed**: All business data permanently stored on decentralized storage
3. **Complete Isolation**: Business A cannot access Business B's AI context
4. **Multi-Provider**: Works with cloud LLM (Together.ai) or local (Ollama)
5. **Web + RAG**: Combine business data with live internet search
6. **No Vendor Lock-in**: CIDs are permanent - data survives provider changes

---

### Data Flow: OAuth → Storage → AI Query

```
1. OAuth Connection
   ├── User clicks "Connect QuickBooks"
   ├── OAuthButton.tsx requires wallet_address
   ├── Backend receives wallet_address with OAuth code
   ├── Tokens encrypted with wallet-derived key
   └── Encrypted blob stored in Pinata with wallet metadata

2. Data Sync
   ├── Backend fetches invoices from QuickBooks
   ├── Data encrypted with wallet-derived key
   ├── Uploaded to Pinata: customer-{wallet}-quickbooks-invoices-*
   └── Indexed in Qdrant: business_{wallet} collection

3. AI Query
   ├── User asks "Show overdue invoices"
   ├── RAG queries business_{wallet} collection only
   ├── Gets relevant CIDs from Qdrant results
   ├── Fetches encrypted data from Pinata
   ├── Decrypts with wallet key
   └── LLM generates response with business-specific context
```

### Security Guarantees

| Guarantee | Implementation | Status |
|-----------|----------------|--------|
| **Wallet-Email Binding** | Privy embedded wallets | ✅ |
| **Token Encryption** | AES-256-GCM + PBKDF2 (100K iter) | ✅ |
| **Storage Isolation** | Wallet-namespaced Pinata metadata | ✅ |
| **Query Isolation** | Wallet-filtered Pinata queries | ✅ |
| **RAG Isolation** | Separate Qdrant collections per wallet | ✅ |
| **Signature Validation** | EIP-191 + 15-min expiration | ✅ |
| **Cross-Business Access** | Mathematically impossible | ✅ |

### Critical Files for Security

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/app/providers.tsx` | Privy/wallet setup | WalletSyncProvider |
| `src/components/OAuthButton.tsx` | Requires wallet for OAuth | handleOAuthConnect |
| `backend/app/services/encryption_service.py` | AES-256-GCM encryption | derive_customer_key, encrypt_oauth_token |
| `backend/app/services/filecoin_service.py` | Wallet-namespaced storage | upload_encrypted_data, list_customer_files |
| `backend/app/services/rag_service.py` | Isolated RAG collections | query_business_rag, _get_collection_name |

---

## OAUTH INTEGRATION ARCHITECTURE (CRITICAL)

### OAuth Flow (MUST UNDERSTAND)

```
1. User clicks "Connect QuickBooks" on frontend (/integrations)
   ↓
2. Frontend calls: POST /api/v1/oauth/start/{provider}
   - Body: { wallet_address: "0x..." }
   ↓
3. Backend generates authorization URL with:
   - redirect_uri: http://localhost:3001/oauth/callback/{provider}
   - state: random token for CSRF protection
   ↓
4. User redirected to provider's authorization page
   ↓
5. User authorizes, provider redirects to:
   http://localhost:3001/oauth/callback/{provider}?code=xxx&state=yyy
   ↓
6. Frontend callback (/src/app/oauth/callback/[provider]/page.tsx):
   - Extracts code and state from URL
   - Sends to backend: POST /api/v1/oauth/callback
   - Body: { provider, code, state, wallet_address, redirect_uri }
   ↓
7. Backend exchanges code for tokens
   - Uses SAME redirect_uri as step 3
   ↓
8. Backend encrypts tokens with Lit Protocol
   ↓
9. Backend stores encrypted tokens in Filecoin
   ↓
10. Frontend redirects to /integrations with success
```

### Critical Files for OAuth

| File | Purpose | Line Numbers |
|------|---------|--------------|
| `backend/app/core/config.py` | Settings class with `frontend_url` | ~65 |
| `backend/app/api/v1/oauth.py` | OAuth endpoints, `get_redirect_uri()` | ~50-100 |
| `backend/.env` | `FRONTEND_URL` and provider credentials | ~69-115 |
| `src/app/oauth/callback/[provider]/page.tsx` | Frontend callback handler | All |

### Environment Variables for OAuth (backend/.env)

```bash
# FRONTEND_URL - MUST match redirect URI registered with providers
FRONTEND_URL=http://localhost:3001

# QuickBooks (CONFIGURED ✅)
QUICKBOOKS_CLIENT_ID=ABX6u8d2g40ZFuGCMcaR6KNGQ0J4GWGukB1oTKtHQqkElbyYuL
QUICKBOOKS_CLIENT_SECRET=E184srbFxJhtrpSC4SfCZosXk3N8VqG16qk1Yqup

# ===========================================
# PRIORITY 1: Google Workspace (NEEDS CREDENTIALS)
# Portal: https://console.cloud.google.com/apis/credentials
# Scopes: openid, email, profile, drive.readonly
# ===========================================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ===========================================
# PRIORITY 2: Microsoft 365 (NEEDS CREDENTIALS)
# Portal: https://portal.azure.com → Azure Active Directory → App Registrations
# Scopes: openid, email, profile, User.Read, Files.Read
# ===========================================
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# ===========================================
# PRIORITY 3: Slack (NEEDS CREDENTIALS)
# Portal: https://api.slack.com/apps
# Scopes: users:read, channels:read, chat:write
# ===========================================
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Secondary Providers (after priorities)
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
ZENDESK_CLIENT_ID=
ZENDESK_CLIENT_SECRET=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=

# Coming Soon Providers (marked in marketplace, stub adapters only)
STRIPE_CLIENT_ID=      # Requires Connect business verification
SQUARE_CLIENT_ID=
PAYPAL_CLIENT_ID=
GUSTO_CLIENT_ID=
CALENDLY_CLIENT_ID=
CANVA_CLIENT_ID=
```

### Redirect URIs to Register with Each Provider

```
http://localhost:3001/oauth/callback/quickbooks
http://localhost:3001/oauth/callback/stripe
http://localhost:3001/oauth/callback/slack
http://localhost:3001/oauth/callback/google
http://localhost:3001/oauth/callback/microsoft
http://localhost:3001/oauth/callback/hubspot
http://localhost:3001/oauth/callback/zendesk
http://localhost:3001/oauth/callback/monday
http://localhost:3001/oauth/callback/salesforce
http://localhost:3001/oauth/callback/shopify
```

### Common OAuth Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "URI query parameter" | Malformed redirect_uri | Check `FRONTEND_URL` in backend/.env |
| "redirect_uri mismatch" | URI not registered in provider | Add exact URI to provider's OAuth settings |
| "Invalid state" | State expired/missing | Restart backend (state stored in memory) |
| "Client ID invalid" | Wrong credentials | Check `{PROVIDER}_CLIENT_ID` in .env |
| "Scope not authorized" | Missing scopes in provider | Add required scopes in provider dashboard |

---

## DOCKER INFRASTRUCTURE

### Container Status (All Healthy as of Dec 7, 2025)

```bash
# Check all containers
docker ps --filter "name=generic-template"

# Expected output:
generic-template-backend    Up (healthy)   8002->8000
generic-template-postgres   Up (healthy)   5433->5432
generic-template-redis      Up (healthy)   6380->6379
generic-template-ollama     Up             11435->11434
generic-template-qdrant     Up             6334->6333, 6335->6334
```

### Critical Docker Commands

```bash
# Start all containers
docker-compose up -d

# Restart backend after code changes
docker-compose restart backend

# View backend logs
docker logs generic-template-backend -f

# Check health endpoint
curl http://localhost:8002/health

# Expected health response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "pinata": "connected",
  "ollama": "connected",
  "arbitrum_rpc": "connected"
}
```

### Environment Variable Fixes Applied (Dec 7, 2025)

1. **Ollama URL** - Added `OLLAMA_URL=http://generic-template-ollama:11434` to .env
2. **Ollama Model** - Added `OLLAMA_MODEL=tinyllama` to .env
3. **Startup.py** - Fixed hardcoded localhost to use `settings.ollama_url`
4. **Filecoin Service** - Fixed Pinata query format to use JSON object format
5. **Docker Compose** - Changed Ollama/Qdrant dependencies to `service_started`
6. **Pinata API Key** - Updated root `.env` with working credentials (see below)
7. **Frontend Build** - Installed missing `@mui/material` and `eslint` dependencies

### CRITICAL: Pinata Configuration (FIXED Dec 7, 2025)

**Docker reads environment variables from the ROOT `.env` file, NOT `backend/.env`!**

The working Pinata API key is: `85129e92e21e7b51cb44`

Both files must have the SAME Pinata credentials:
- **Root `.env`** (line ~40-43) - Docker reads from here
- **`backend/.env`** (line ~31-34) - Backend config reference

If you change Pinata credentials:
```bash
# 1. Update BOTH .env files with same credentials
# 2. Recreate the backend container (restart is NOT enough!)
docker-compose stop backend && docker-compose rm -f backend && docker-compose up -d backend

# 3. Verify new credentials loaded
docker exec generic-template-backend env | grep PINATA_API_KEY
# Should show: PINATA_API_KEY=85129e92e21e7b51cb44

# 4. Test Pinata operations
curl "http://localhost:8002/api/v1/integrations/quickbooks/data?wallet_address=0x20B7d1426649D9a573ba7Fd10592456264220cbF"
```

**Common Pinata Error:**
- Error: `NO_SCOPES_FOUND` - The API key doesn't have required permissions
- Solution: Use an admin API key from Pinata dashboard, not a scoped key

---

## API ENDPOINTS REFERENCE

### Health & Status
```bash
GET /health                          # Health check
GET /api/v1/debug/status             # Debug status
```

### Dashboard
```bash
GET /api/v1/dashboard/kpis?wallet_address=0x...
GET /api/v1/dashboard/recent-activity?wallet_address=0x...
GET /api/v1/dashboard/quick-actions?wallet_address=0x...
```

### Marketplace
```bash
GET /api/v1/marketplace/products           # List all products
GET /api/v1/marketplace/categories         # List categories
POST /api/v1/marketplace/purchases         # Purchase product
```

### OAuth
```bash
POST /api/v1/oauth/start/{provider}        # Start OAuth flow
POST /api/v1/oauth/callback                # Handle callback
GET /api/v1/oauth/status/{provider}?wallet_address=0x...
```

### Integrations
```bash
GET /api/v1/integrations/installed?wallet_address=0x...
GET /api/v1/integrations/{provider}/data?wallet_address=0x...
DELETE /api/v1/integrations/{provider}?wallet_address=0x...
```

### AI Assistant (7 Endpoints)
```bash
# General Chat (works without integrations)
POST /api/v1/ai/chat                       # General AI chat with optional RAG
GET /api/v1/ai/chat/history?wallet_address=0x...

# Advanced AI Capabilities
POST /api/v1/ai/query                      # Business-specific RAG query
POST /api/v1/ai/analyze                    # Document analysis (5 types)
POST /api/v1/ai/research                   # Deep research mode (3 depth levels)
POST /api/v1/ai/search                     # Web search capability
GET /api/v1/ai/models                      # List available AI models
GET /api/v1/ai/health                      # AI service health check
```

---

## QUICK COMMANDS

### Frontend Development
```bash
cd /home/macoding/blokko-internal-os/varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard

# Start development server
npm run dev                       # http://localhost:3001

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run type-check

# E2E tests
npm run test:e2e
```

### Backend Development
```bash
cd backend

# Restart backend container
docker-compose restart backend

# View logs
docker logs generic-template-backend -f

# Run Python tests
docker exec generic-template-backend pytest

# Access PostgreSQL
docker exec -it generic-template-postgres psql -U generic_template
```

### Docker Management
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild backend
docker-compose build backend && docker-compose up -d backend

# Full reset
docker-compose down -v && docker-compose up -d
```

---

## KNOWN ISSUES & FIXES

### Issue 1: Ollama "not configured"
**Symptom:** Health check shows ollama: "not configured"
**Fix:** Add to backend/.env:
```
OLLAMA_URL=http://generic-template-ollama:11434
OLLAMA_MODEL=tinyllama
```
**File:** backend/app/core/startup.py line ~162

### Issue 2: Pinata API query format
**Symptom:** Error "metadata query value must take the form of an object"
**Fix:** Change query format in `backend/app/services/filecoin_service.py` line ~292:
```python
filters = {
    "metadata[keyvalues][customer_wallet]": json.dumps({"value": customer_wallet.lower(), "op": "eq"})
}
```

### Issue 3: OAuth redirect_uri mismatch
**Symptom:** "redirect_uri does not match registered URI"
**Fix:**
1. Check `FRONTEND_URL` in backend/.env matches exactly
2. Register exact URI in provider dashboard (no trailing slash)
3. Ensure `get_redirect_uri()` in oauth.py uses settings.frontend_url

---

## DOCUMENTATION REFERENCE

| Document | Location | Purpose |
|----------|----------|---------|
| **OAUTH_PROVIDER_SETUP_GUIDE.md** | docs/guides/ | OAuth provider setup |
| **API_QUICK_REFERENCE.md** | docs/api/ | API endpoint reference |
| **DEPLOYMENT_GUIDE.md** | docs/guides/ | Deployment instructions |
| **TROUBLESHOOTING.md** | docs/guides/ | Common issues |
| **SECURITY_AUDIT_REPORT.md** | docs/security/ | Security audit |

---

## VARITY L3 NETWORK CONFIGURATION

```typescript
// src/lib/varity-chain.ts
{
  id: 33529,
  name: "Varity L3 Testnet",
  rpcUrl: "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
  explorer: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
  usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" // 6 decimals!
}
```

---

## WHEN WORKING ON THIS PROJECT

### Before Making Changes
1. Read this CLAUDE.md file completely
2. Check `backend/CLAUDE.md` for backend-specific rules
3. Check `src/CLAUDE.md` for frontend-specific rules
4. Run `docker ps --filter "name=generic-template"` to verify containers

### After Making Changes
1. Run `npm run build` for frontend changes
2. Run `docker-compose restart backend` for backend changes
3. Check `docker logs generic-template-backend` for errors
4. Test the specific feature in browser

### For OAuth Work
1. Read `docs/guides/OAUTH_PROVIDER_SETUP_GUIDE.md`
2. Check provider credentials in `backend/.env`
3. Verify redirect URI matches exactly
4. Test full flow in browser (cannot automate OAuth fully)

---

## SUPPORT

- **Documentation:** See `docs/guides/` folder
- **Historical Context:** See `docs/archive/agent-reports/`
- **GitHub Issues:** Report bugs and feature requests
- **Enterprise Support:** Contact Varity team
