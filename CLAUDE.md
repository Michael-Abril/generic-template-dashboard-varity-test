# CLAUDE.md - Varity Generic Dashboard Template

**Last Updated:** December 26, 2025
**Status:** LIVE at https://app.varity.so
**Build Status:** Passing (Frontend: Vercel | Backend: Railway)

---

## CRITICAL STATUS ASSESSMENT

### Infrastructure Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend (Vercel)** | ✅ WORKING | Live at https://app.varity.so |
| **Backend (Railway)** | ✅ WORKING | Live at https://generic-template-dashboard-production.up.railway.app |
| **Pinata Gateway** | ✅ FIXED | Using dedicated gateway `varity.mypinata.cloud` (no rate limits) |
| **Qdrant (RAG)** | ⚠️ PARTIAL | Deployed, but not all data being indexed |

### Data Pipeline Status (CRITICAL)

| Component | Status | Issue |
|-----------|--------|-------|
| **Pinata Storage** | ✅ WORKING | Dedicated gateway deployed Dec 26, 2025 |
| **RAG Indexing** | ⚠️ NOT FULLY WORKING | Data not consistently going to Qdrant on sync |
| **Live API Calls** | ⚠️ PARTIAL | Not all integrations have live endpoints |
| **Hybrid Data Model** | ⚠️ DOCUMENTED | Architecture defined but not fully implemented |

**See:** `src/components/integrations/README.md` for full Hybrid Data Model documentation

### What Actually Works vs. What's Documented

| Feature | Documented | Actual Status | Notes |
|---------|:----------:|:-------------:|-------|
| **Frontend Deployment** | ✅ | ✅ WORKING | Live on Vercel |
| **Backend Deployment** | ✅ | ✅ WORKING | Live on Railway |
| **OAuth Flow (QuickBooks)** | ✅ | ⚠️ PARTIAL | Flow works, data sync returns 403 (dev mode) |
| **OAuth Flow (Google)** | ✅ | ✅ WORKING | Tested and functional |
| **OAuth Flow (Microsoft)** | ✅ | ❌ NOT WORKING | Needs investigation |
| **OAuth Flow (Slack)** | ✅ | ✅ WORKING | Fixed Dec 26 - requires groups:read,groups:history scopes |
| **OAuth Flow (Salesforce)** | ✅ | ❓ TESTING | User testing with dev account |
| **OAuth Flow (HubSpot)** | ✅ | ❓ TESTING | User testing with free account |
| **Data Sync (Google)** | ✅ | ⚠️ PARTIAL | Syncs but RAG indexing incomplete |
| **Data Sync (Slack)** | ✅ | ⚠️ PARTIAL | Channels/messages via live API, files to RAG |
| **AI Assistant** | ✅ | ✅ WORKING | Chat works, RAG limited by indexing issues |
| **Onboarding Flow** | ✅ | ✅ WORKING | 6-step wizard complete |
| **Dashboard KPIs** | ✅ | ✅ WORKING | Clean redesigned UI with AI insights |
| **Marketplace** | ✅ | ✅ WORKING | OAuth-only (USDC purchases post-MVP) |
| **Team Management** | ✅ | ✅ WORKING | Frontend makes API calls to backend |
| **Data Import** | ✅ | ⏳ COMING SOON | UI shows "Coming Soon" badge |
| **Data Export** | ✅ | ✅ WORKING | JSON, CSV, Excel formats |

---

## KNOWN ISSUES & TECHNICAL DEBT

### HIGH PRIORITY (Blocking or User-Facing)

| Issue | Location | Impact | Status |
|-------|----------|--------|--------|
| **QuickBooks 403 Error** | OAuth sync | Cannot sync production data | BLOCKED - needs Intuit approval |

### MEDIUM PRIORITY (Functional but Incomplete)

| Issue | Location | Impact |
|-------|----------|--------|
| Document upload incomplete | `AIChat.tsx` | File input hidden, no handler |
| Console.log statements | Throughout | Should use logger.ts |

### LOW PRIORITY (Polish)

| Issue | Location |
|-------|----------|
| TypeScript `any` types | Various API responses |
| Inconsistent loading states | Mixed spinners/skeletons |

### ✅ RESOLVED (December 23, 2025)

| Issue | Resolution |
|-------|------------|
| Duplicate component files | Deleted 9 duplicate files |
| USDC purchase code | Removed from marketplace (OAuth-only now) |
| Data import broken | Changed to "Coming Soon" UI |
| Storage usage hardcoded | Replaced with decentralized storage info card |
| Team invites simulated | Frontend makes proper API calls |

---

## LIVE DEPLOYMENT

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://app.varity.so | ✅ Live |
| **Backend API** | https://generic-template-dashboard-production.up.railway.app | ✅ Live |
| **Health Check** | https://generic-template-dashboard-production.up.railway.app/health | ✅ Healthy |
| **API Docs** | https://generic-template-dashboard-production.up.railway.app/docs | ✅ Available |

---

## 6 PRIORITY INTEGRATIONS STATUS

**IMPORTANT:** No integration is fully working yet. All require completion of:
1. RAG Storage (data syncing to Pinata and indexing in Qdrant)
2. Live API endpoints for appropriate data types
3. Frontend UI displaying all data correctly

| # | Integration | OAuth | Page Loads | RAG Sync | Live API | Status |
|---|-------------|:-----:|:----------:|:--------:|:--------:|--------|
| 1 | **QuickBooks** | ✅ | ⚠️ Partial | ❌ | ❌ | Needs data pipeline |
| 2 | **Google Workspace** | ✅ | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial | Needs completion |
| 3 | **Microsoft 365** | ❌ | ❌ | ❌ | ⚠️ Partial | OAuth broken |
| 4 | **Slack** | ✅ | ⚠️ Partial | ⚠️ Files only | ✅ Ch/Msg/Users | Needs RAG for files |
| 5 | **Salesforce** | ❓ | ❓ | ❌ | ❌ | Testing |
| 6 | **HubSpot** | ❓ | ❓ | ❌ | ❌ | Testing |

### Hybrid Data Model (See `src/components/integrations/README.md`)

| Integration | RAG Storage (Pinata → Qdrant) | Live API Calls |
|-------------|------------------------------|----------------|
| **Google Workspace** | Drive files, Contacts | Gmail, Calendar |
| **Microsoft 365** | OneDrive files, Contacts | Mail, Calendar |
| **Slack** | Files | Channels, Messages, Users |
| **QuickBooks** | Invoices, Expenses, Customers, Vendors, Payments | TBD |
| **Salesforce** | Contacts, Opportunities, Accounts, Leads, Tasks | TBD |
| **HubSpot** | Contacts, Deals, Companies, Emails, Tickets | TBD |

### Production Redirect URIs (Must be registered)

```
https://app.varity.so/oauth/callback/quickbooks   ← developer.intuit.com
https://app.varity.so/oauth/callback/google       ← console.cloud.google.com
https://app.varity.so/oauth/callback/microsoft    ← portal.azure.com
https://app.varity.so/oauth/callback/slack        ← api.slack.com
https://app.varity.so/oauth/callback/salesforce   ← developer.salesforce.com
https://app.varity.so/oauth/callback/hubspot      ← developers.hubspot.com
```

---

## PAGE-BY-PAGE FUNCTIONALITY

### Fully Working Pages

| Page | URL | Status | Notes |
|------|-----|--------|-------|
| **Homepage** | `/` | ✅ 100% | Hero, FAQ, marketing complete |
| **Onboarding** | `/onboarding` | ✅ 100% | 6-step wizard, email collection |
| **AI Assistant** | `/ai-assistant` | ✅ 95% | Chat works, document upload incomplete |
| **Dashboard** | `/dashboard` | ✅ 100% | Clean redesigned UI with AI insights widget |
| **Marketplace** | `/marketplace` | ✅ 100% | OAuth-only connections (USDC post-MVP) |
| **Settings** | `/settings` | ✅ 95% | All tabs work, data import "Coming Soon" |

### Working But Data-Dependent Pages

| Page | URL | Status | Notes |
|------|-----|--------|-------|
| **Analytics** | `/analytics` | ⚠️ Needs Data | Charts render, need backend data |
| **Integrations** | `/integrations` | ⚠️ Backend Dependent | List works, sync depends on backend |
| **Integration Tools** | `/dashboard/tools/[integration]` | ⚠️ Needs Data | UI complete, needs synced data |

---

## ONBOARDING FLOW (Complete - December 2025)

Professional 6-step wizard optimized for 30-60 year old business owners.

### Components

```
src/components/onboarding/
├── OnboardingWizard.tsx       # Main controller (state, navigation)
├── OnboardingProgress.tsx     # Progress indicator (mobile + desktop)
├── TrialBadge.tsx            # Trial tier badge (30-day bonus or 14-day)
└── steps/
    ├── WelcomeStep.tsx        # Step 1: Welcome + trust signals
    ├── CompanyProfileStep.tsx # Step 2: Company info + email (GTM)
    ├── IntegrationSelectStep.tsx # Step 3: Industry-based recommendations
    ├── OAuthConnectStep.tsx   # Step 4: OAuth with permissions preview
    ├── SyncingStep.tsx        # Step 5: Visual 5-stage sync + skip option
    └── CompleteStep.tsx       # Step 6: Celebration + AI preview
```

### UX Features (Based on 2025 Best Practices)

| Feature | Location | Purpose |
|---------|----------|---------|
| **Trust Signals** | WelcomeStep | SOC 2 Compliant, 256-bit Encryption badges |
| **Time Estimates** | WelcomeStep, CompanyProfileStep | "~2 min", "Only 3 fields required" |
| **Auto-Save Indicator** | CompanyProfileStep | "Your progress is auto-saved" |
| **Industry Recommendations** | IntegrationSelectStep | Shows relevant integrations for industry |
| **Skip Options** | IntegrationSelectStep, OAuthConnectStep, SyncingStep | Reduces abandonment |
| **Celebration Animation** | CompleteStep | Animated checkmark + PartyPopper icon |
| **AI Preview** | CompleteStep | Interactive sample queries before dashboard |
| **Trial Badge** | TrialBadge | "Bonus" label with explanation for 30-day users |

### GTM Data Collection

| Field | Required | Purpose |
|-------|----------|---------|
| `contact_email` | ✅ Yes | Trial communications, conversion follow-up |
| `contact_name` | No | Personalization |
| `company_name` | ✅ Yes | Dashboard customization |
| `industry` | ✅ Yes | Integration recommendations |
| `company_size` | No | Analytics |
| `referral_source` | No | Marketing attribution |

### Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/onboarding/status` | GET | Get onboarding progress |
| `/api/v1/onboarding/step` | PUT | Save current step |
| `/api/v1/onboarding/complete` | POST | Mark onboarding complete |
| `/api/v1/onboarding/trial-tier` | GET | Get trial tier (30 or 14 days) |
| `/api/v1/settings` | PUT | Save company profile + contact info |

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 14)                       │
│                    https://app.varity.so                         │
│          Privy Auth + thirdweb Web3 + Tailwind CSS               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│     https://generic-template-dashboard-production.up.railway.app │
│         OAuth + Encryption + Filecoin + Together.ai              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    INFRASTRUCTURE                                │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│  PostgreSQL  │    Redis     │   Qdrant     │    Pinata         │
│  (Railway)   │  (Railway)   │  (Railway)   │  (Filecoin/IPFS)  │
└──────────────┴──────────────┴──────────────┴───────────────────┘
```

---

## DEVELOPMENT WORKFLOW

### Quick Start (No Docker Needed)

```bash
# Clone repo
git clone https://github.com/varity-labs/generic-template-dashboard.git
cd generic-template-dashboard

# Install dependencies
npm install --legacy-peer-deps

# Build to check for errors
npm run build

# Push to deploy (auto-deploys to Vercel)
git add . && git commit -m "fix: description" && git push origin main
```

### Code Quality Rules (MUST FOLLOW)

```bash
# After EVERY frontend change:
npm run build

# Fix ALL TypeScript errors before committing
# Fix ALL ESLint warnings where possible
# This step must NEVER be skipped
```

---

## AI ASSISTANT FEATURES

| Feature | Status | Backend Endpoint |
|---------|--------|------------------|
| **General Chat** | ✅ Working | `POST /api/v1/ai/chat/general` |
| **RAG Query** | ✅ Working | `POST /api/v1/ai/query/combined` |
| **Deep Research** | ✅ Working | `POST /api/v1/ai/research` |
| **Document Analysis** | ⚠️ Incomplete | `POST /api/v1/ai/analyze/document` |
| **Conversation History** | ✅ Working | `GET/POST /api/v1/conversations/` |
| **Send Email (Google)** | ✅ Working | `POST /api/v1/integrations/google/send-email` |
| **Send Email (Microsoft)** | ❓ Untested | `POST /api/v1/integrations/microsoft/mail/send` |
| **Create Document** | ⚠️ Partial | Upload endpoints implemented |

### AI Modes

| Mode | Description | Web Search |
|------|-------------|:----------:|
| **Standard** | Quick answers from business data | ❌ |
| **Deep Research** | Comprehensive analysis | Optional |
| **Deep Analysis** | Executive-level reports | ❌ |
| **Document** | Upload and analyze files | ❌ |

---

## GOOGLE WORKSPACE INTEGRATION (Reference Implementation)

This is the most complete integration and serves as the reference for others:

| Component | Status | File |
|-----------|--------|------|
| **Gmail Tab** | ✅ Working | `GmailInbox.tsx` |
| **Calendar Tab** | ✅ Working | `CalendarView.tsx` |
| **Drive Tab** | ✅ Working | `DriveExplorer.tsx` |
| **Contacts Tab** | ⚠️ Partial | `ContactsList.tsx` (form incomplete) |
| **Tasks Tab** | Coming Soon | Placeholder UI |

### Recent Fixes (Dec 18, 2025)

- Fixed data sync loading (was taking 6+ minutes, now ~26 seconds)
- Added `latest_only` parameter to reduce Filecoin queries
- Fixed text visibility issues (gray-500 → gray-700)
- Implemented search filtering with useMemo
- Fixed Archive, Reply All, Forward handlers
- Added working modal buttons (Preview, Share, Star, Rename)

### Recent Fixes (Dec 23, 2025)

- **Dashboard Redesign**: Clean Business Overview with AI Insight widget
- **Marketplace Cleanup**: Removed USDC purchase code, OAuth-only connections
- **Settings Improvements**: Data Import → "Coming Soon", decentralized storage info card
- **Duplicate Files Deleted**: Removed 9 duplicate component files
- **Text Visibility Fixes**: Added text-gray-900 to dropdowns across Analytics, Marketplace, Integration Tools

### Recent Fixes (Dec 26, 2025)

- **Pinata Gateway Fix (CRITICAL)**: Switched from public gateway to dedicated gateway `varity.mypinata.cloud`
  - Public gateway had rate limits causing 429 errors
  - Dedicated gateway has NO rate limits for retrieval
  - Added `PINATA_GATEWAY_URL` env var support in `config.py`
  - Added retry logic with exponential backoff in `filecoin_service.py`

- **Slack OAuth Fix**: Fixed `'OAuthToken' object has no attribute 'encrypted_token'` error
  - Changed all Slack endpoints to use `oauth_token.access_token` property
  - Required Slack App scopes: `channels:read`, `channels:history`, `groups:read`, `groups:history`, `users:read`, `files:read`, `chat:write`

- **Slack Live API**: Implemented live API endpoints for channels, messages, users
  - Channels and messages NOT stored in RAG (fetched live)
  - Only files go to RAG storage

---

## MULTI-TENANT SECURITY (4-Layer Architecture)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **1. Authentication** | Privy | Email → Embedded Wallet binding |
| **2. Encryption** | AES-256-GCM + PBKDF2 | Wallet-derived encryption keys |
| **3. Storage** | Pinata (Filecoin/IPFS) | Wallet-namespaced file storage |
| **4. RAG** | Qdrant | Isolated vector collections per wallet |

**Security Guarantee:** Cross-business data access is mathematically impossible.

---

## ENVIRONMENT VARIABLES

### Vercel (Frontend)

```bash
NEXT_PUBLIC_API_URL=https://generic-template-dashboard-production.up.railway.app
NEXT_PUBLIC_PRIVY_APP_ID=cmhwbozxu004fjr0cicfz0tf8
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=acb17e07e34ab2b8317aa40cbb1b5e1d
```

### Railway (Backend)

```bash
# All OAuth credentials are set ✅
QUICKBOOKS_CLIENT_ID=✅
GOOGLE_CLIENT_ID=✅
MICROSOFT_CLIENT_ID=✅
SLACK_CLIENT_ID=✅
SALESFORCE_CLIENT_ID=✅
HUBSPOT_CLIENT_ID=✅

# Infrastructure
DATABASE_URL=✅
TOGETHER_API_KEY=✅
PINATA_API_KEY=✅
FRONTEND_URL=https://app.varity.so
```

---

## TESTING CHECKLIST

### Before Launch

- [ ] Test QuickBooks OAuth flow (blocked by 403)
- [ ] Test Microsoft 365 OAuth flow
- [ ] Test Slack OAuth flow
- [ ] Test Salesforce OAuth flow
- [ ] Test HubSpot OAuth flow
- [ ] Verify data appears on Dashboard after sync
- [ ] Test AI Assistant with synced data
- [x] Test all buttons on Settings page (Dec 23, 2025)
- [x] Remove duplicate component files (Dec 23, 2025)
- [ ] Verify Analytics page renders with data

### Manual Testing URLs

```
https://app.varity.so/                    # Homepage
https://app.varity.so/onboarding          # Onboarding wizard
https://app.varity.so/marketplace         # Connect integrations
https://app.varity.so/dashboard           # Main dashboard
https://app.varity.so/ai-assistant        # AI chat
https://app.varity.so/settings            # User settings
https://app.varity.so/analytics           # Analytics charts
https://app.varity.so/dashboard/tools/google  # Google Workspace tools
```

---

## FILE STRUCTURE

```
generic-template-dashboard/
├── src/                          # Next.js 14 frontend
│   ├── app/                      # App Router pages
│   ├── components/               # React components
│   ├── hooks/                    # React hooks
│   ├── lib/                      # Utilities
│   ├── services/                 # API client
│   └── types/                    # TypeScript types
│
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── api/v1/               # REST API endpoints
│   │   ├── adapters/             # 25 integration adapters
│   │   ├── core/                 # Config, database
│   │   ├── services/             # Business logic
│   │   └── models/               # SQLAlchemy models
│   └── alembic/                  # Database migrations
│
├── CLAUDE.md                     # This file
├── README.md                     # Project overview
├── src/CLAUDE.md                 # Frontend-specific guide
└── backend/CLAUDE.md             # Backend-specific guide
```

---

## WHEN WORKING ON THIS PROJECT

### Before Making Changes

1. Read this CLAUDE.md file
2. Check `src/CLAUDE.md` for frontend rules
3. Check `backend/CLAUDE.md` for backend rules
4. Run `npm run build` to verify current state

### After Making Changes

1. Run `npm run build` for frontend changes
2. Fix ALL TypeScript errors
3. Test the specific feature in browser
4. Commit with descriptive message
5. Push to trigger auto-deploy

---

## SUPPORT

- **Issues:** https://github.com/varity-labs/generic-template-dashboard/issues
- **Documentation:** `/docs` folder
- **Enterprise:** Contact Varity team
