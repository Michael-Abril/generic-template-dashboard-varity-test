# CLAUDE.md - Varity Generic Dashboard Template

**Last Updated:** December 30, 2025
**Status:** LIVE at https://app.varity.so
**Build Status:** Passing (Frontend: Vercel | Backend: Railway)
**CI/CD:** GitHub Actions + Husky Pre-commit Hooks + Playwright E2E

> **VERIFIED:** This documentation was validated via live API testing on December 30, 2025 at https://app.varity.so with test wallet `0x738C812FB221ba32E8726fe38961570a700e87b9`

---

## BRUTAL REALITY CHECK (December 30, 2025)

### Overall Assessment: 45% Working, 55% Broken/Misleading

**The Good News:**
- AI Assistant actually works (90%)
- Infrastructure is rock solid
- Planning feature works (95%)
- Conversations persist (100%)

**The Bad News:**
- Most OAuth tokens EXPIRED within 24-48 hours
- Integration pages are broken or misleading
- Dashboard KPIs show fake/wrong data
- Analytics page is 100% mock data
- Frontend doesn't use available live API endpoints

---

## WHAT ACTUALLY WORKS (Verified with Real Data)

| Feature | Status | Evidence |
|---------|:------:|----------|
| **AI Assistant** | 90% WORKING | RAG queries work, conversations persist, web search works |
| **Slack Live API** | 100% WORKING | Channels endpoint returns 3 channels |
| **Planning** | 95% WORKING | 1 task indexed in RAG, CRUD works |
| **Conversations** | 100% WORKING | 6 conversations stored |
| **Infrastructure** | 100% WORKING | Backend, Pinata, Qdrant all healthy |

## WHAT'S BROKEN (Verified)

| Feature | Status | Evidence |
|---------|:------:|----------|
| **Google OAuth** | EXPIRED | `needs_reauth: true`, `sync_status: "expired"` |
| **Microsoft OAuth** | EXPIRED | `needs_reauth: true`, `sync_status: "expired"` |
| **QuickBooks OAuth** | EXPIRED | `needs_reauth: true`, `data_count: 0` |
| **Integration Pages** | 80% BROKEN | No live API implementation for most tabs |
| **Analytics Page** | 100% MOCK DATA | Confirmed using fake data |
| **Dashboard KPIs** | MISLEADING | Shows "$5.00" revenue but QuickBooks has `data_count: 0` |

---

## INFRASTRUCTURE STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend (Vercel)** | WORKING | Live at https://app.varity.so |
| **Backend (Railway)** | WORKING | Live at https://generic-template-dashboard-production.up.railway.app |
| **Pinata Gateway** | WORKING | Dedicated gateway `varity.mypinata.cloud` |
| **Qdrant (RAG)** | WORKING | Planning data indexed, integration data partial |
| **PostgreSQL** | WORKING | Railway managed |
| **Redis** | WORKING | Railway managed |

---

## 6 INTEGRATIONS: ACTUAL STATUS

### Critical Finding: OAuth Tokens Expire Within 24-48 Hours

| Integration | OAuth Status | Data Synced | Live API | Frontend Uses Live API | Overall |
|-------------|:------------:|:-----------:|:--------:|:----------------------:|:-------:|
| **Google** | EXPIRED | 83 files (stale) | Can't test | NO | 20% |
| **Slack** | ACTIVE | 2 users only | YES (3 channels) | NO | 50% |
| **Microsoft** | EXPIRED | 0 | Can't test | NO | 10% |
| **QuickBooks** | EXPIRED | 0 | Can't test | NO | 5% |
| **Salesforce** | UNKNOWN | Unknown | Unknown | NO | ? |
| **HubSpot** | UNKNOWN | Unknown | Unknown | NO | ? |

### Token Expiration Timeline (Actual)

| Integration | Last Sync | Status After |
|-------------|-----------|--------------|
| Google | Dec 29, 8:41 PM | EXPIRED (<24 hours) |
| Microsoft | Dec 29, 2:43 AM | EXPIRED (<48 hours) |
| QuickBooks | Dec 29, 6:15 PM | EXPIRED (<24 hours) |
| Slack | Dec 26 | ACTIVE (4+ days) |

### Per-Integration Details

#### Google Workspace - 20% Working

**OAuth:** EXPIRED
**Synced Data:** 83 Drive files (from Dec 29 - now stale)

| Tab | Status | Notes |
|-----|--------|-------|
| Home | BROKEN | Can't fetch stats (OAuth expired) |
| Gmail | BROKEN | "Unable to load emails" error |
| Calendar | BROKEN | OAuth expired |
| Drive | PARTIAL | Shows 83 files from old sync, links won't work |
| Contacts | UNKNOWN | Not tested |
| Tasks | Coming Soon | Placeholder UI |

#### Slack - 50% Working (Best Integration)

**OAuth:** ACTIVE
**Synced Data:** 2 users only (channels/messages NOT synced)

| Tab | Status | Notes |
|-----|--------|-------|
| Channels | SHOULD WORK | Live API returns 3 channels, BUT frontend doesn't call it |
| Messages | BROKEN | No sync, no live API in frontend |
| Users | WORKS | 2 users synced |
| Files | BROKEN | 0 files synced |

**Critical Issue:** Live API endpoint exists and works (`GET /api/v1/integrations/slack/channels`), but frontend only fetches sync data from `/api/v1/integrations/slack/data`.

#### Microsoft 365 - 10% Working

**OAuth:** EXPIRED (worked on Dec 29)
**Synced Data:** 0

All tabs BROKEN. Previous documentation said "OAuth broken, needs investigation" - reality is OAuth worked but tokens expired and no data persisted.

#### QuickBooks - 5% Working

**OAuth:** EXPIRED
**Synced Data:** 0

All tabs BROKEN. Dashboard shows "$5.00 revenue" which is either cached or fake data (actual `data_count: 0`).

---

## CRITICAL ARCHITECTURAL ISSUES

### Issue #1: Frontend Doesn't Use Live API Endpoints

**Location:** `src/app/dashboard/tools/[integration]/page.tsx` lines 2417-2420

```typescript
// Current code (BROKEN)
const res = await fetch(`${apiBase}/api/v1/integrations/${integration}/data`);
// This ONLY fetches sync data from Pinata, ignores live API endpoints
```

**Impact:** Slack channels endpoint returns 3 channels, but frontend shows empty because it's waiting for sync data.

**Fix Required:** Frontend needs to detect data types that use live API and call those endpoints instead.

### Issue #2: OAuth Tokens Expire Aggressively

**Evidence:**
- Google: Expired in <24 hours
- Microsoft: Expired in <48 hours
- QuickBooks: Expired in <24 hours
- Only Slack stayed active (4+ days)

**Location:** `backend/app/api/v1/integrations.py` lines 66-129 (refresh_oauth_token)

**Impact:** Users see "reconnect" prompts constantly. No automatic token refresh.

### Issue #3: Dashboard KPIs Show Wrong/Fake Data

**From `/api/v1/dashboard/kpis`:**

| KPI | Displayed | Actual |
|-----|-----------|--------|
| QuickBooks Revenue | "$5.00" | `data_count: 0` (no data) |
| Google Drive Files | "1" | 83 files synced |

**Location:** `backend/app/api/v1/dashboard.py`

### Issue #4: Analytics Page Uses Mock Data

**Status:** 100% MOCK DATA

The Analytics page displays charts but all data is hardcoded mock data, not real integration data.

---

## WHAT ACTUALLY WORKS WELL

### AI Assistant - 90% Working

**Test Query:** "What files are in my Google Drive?"

**Result:** SUCCESS with:
- RAG sources (5 CIDs from actual synced data)
- Web search results (3 sources)
- Executive summary format
- Citations from both RAG and web

**What Works:**
- RAG queries actually search indexed data
- Web search integration
- Conversation history persists (6 conversations)
- Multiple AI modes

**What Doesn't Work:**
- Context picker likely empty (most integrations have `data_count: 0`)
- Email send actions (OAuth tokens expired)
- Document creation (OAuth tokens expired)

### Planning Feature - 95% Working

**From `/api/v1/planning/tasks`:**
```json
{
  "tasks": [{
    "id": 1,
    "title": "finish3PL Shipment",
    "priority": "medium",
    "category": "operations",
    "is_completed": true,
    "rag_indexed": true
  }],
  "total_count": 1,
  "completed_count": 1
}
```

- Task CRUD works
- RAG indexed (AI can query it)
- Dashboard widget displays it
- WCAG accessible

### Conversations - 100% Working

6 conversations stored with:
- Timestamps preserved
- Message counts tracked
- Titles extracted

---

## HYBRID DATA MODEL: Documented vs Implemented

### What Documentation Claims

| Integration | RAG Storage | Live API |
|-------------|-------------|----------|
| Google | Drive, Contacts | Gmail, Calendar |
| Microsoft | OneDrive, Contacts | Mail, Calendar |
| Slack | Files | Channels, Messages, Users |

### What's Actually Implemented

| Integration | RAG Storage | Live API Backend | Frontend Calls Live API |
|-------------|-------------|------------------|------------------------|
| Google | Drive (83 files) | EXISTS but untested | NO |
| Microsoft | Nothing (0) | EXISTS but untested | NO |
| Slack | Users only (2) | YES, works | NO |
| QuickBooks | Nothing (0) | Unknown | NO |

**The Problem:** Live API endpoints exist in backend but frontend NEVER calls them. Frontend only fetches from `/api/v1/integrations/{integration}/data` which is sync data only.

---

## PAGE STATUS (Verified)

### Fully Working Pages

| Page | URL | Status |
|------|-----|--------|
| **Homepage** | `/` | 100% WORKING |
| **Onboarding** | `/onboarding` | 100% WORKING |
| **AI Assistant** | `/ai-assistant` | 90% WORKING |
| **Dashboard** | `/dashboard` | 70% WORKING (KPIs misleading) |
| **Tasks** | `/dashboard/tasks` | 95% WORKING |
| **Roadmap** | `/dashboard/roadmap` | 95% WORKING |
| **Marketplace** | `/marketplace` | 100% WORKING (OAuth-only) |
| **Settings** | `/settings` | 90% WORKING |

### Broken/Misleading Pages

| Page | URL | Status | Issue |
|------|-----|--------|-------|
| **Analytics** | `/analytics` | 0% REAL DATA | 100% mock data |
| **Google Workspace** | `/dashboard/tools/google` | 20% WORKING | OAuth expired |
| **QuickBooks** | `/dashboard/tools/quickbooks` | 5% WORKING | OAuth expired, no data |
| **Microsoft 365** | `/dashboard/tools/microsoft` | 10% WORKING | OAuth expired, no data |
| **Slack** | `/dashboard/tools/slack` | 50% WORKING | Frontend doesn't use live API |
| **Integrations** | `/integrations` | MISLEADING | Shows connections but most expired |

---

## PRIORITY FIXES NEEDED

### Priority 1: Fix OAuth Token Refresh (CRITICAL)

**Impact:** Blocks ALL integrations
**Files:** `backend/app/api/v1/integrations.py` lines 66-129

**Problem:** Tokens expire within 24-48 hours. No automatic refresh.

**Success Criteria:**
- Tokens last > 7 days
- Automatic refresh before expiry
- User never sees "reconnect" unless manually disconnected

### Priority 2: Fix Frontend Live API Integration (CRITICAL)

**Impact:** Slack works in backend but shows empty in frontend
**Files:** `src/app/dashboard/tools/[integration]/page.tsx`

**Required Change:**
```typescript
// Detect live API data types and call live endpoints
const liveDataTypes = {
  google: ['gmail', 'calendar'],
  microsoft: ['mail', 'calendar'],
  slack: ['channels', 'messages', 'users']
};

if (liveDataTypes[integration]?.includes(dataType)) {
  const res = await fetch(`/api/v1/integrations/${integration}/${dataType}`);
} else {
  const res = await fetch(`/api/v1/integrations/${integration}/data`);
}
```

### Priority 3: Fix Dashboard KPIs

**Impact:** Users see wrong numbers
**Files:** `backend/app/api/v1/dashboard.py`

**Issues:**
- QuickBooks "$5.00" when `data_count=0`
- Google Drive "1 file" when 83 synced

### Priority 4: Remove/Label Mock Data

**Impact:** Honesty with users
**Files:** Analytics page components

**Options:**
1. Remove analytics page entirely
2. Add "DEMO DATA" banner
3. Replace with "Coming Soon"

---

## CI/CD GUARDRAILS (December 29, 2025)

| Guardrail | Tool | What It Catches |
|-----------|------|-----------------|
| **Pre-commit Hooks** | Husky | Build errors BEFORE committing |
| **CI Pipeline** | GitHub Actions | Broken PRs BEFORE merging |
| **E2E Tests** | Playwright | UI regressions, broken pages |
| **API Health Checks** | CI Pipeline | Backend/AI service failures |

**Files:**
- `.husky/pre-commit` - TypeScript + Build check
- `.github/workflows/ci.yml` - Full CI pipeline
- `playwright.config.ts` - Playwright configuration
- `tests/e2e/*.spec.ts` - E2E test suites

---

## LIVE DEPLOYMENT

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://app.varity.so | WORKING |
| **Backend API** | https://generic-template-dashboard-production.up.railway.app | WORKING |
| **Health Check** | /health | HEALTHY |
| **API Docs** | /docs | AVAILABLE |

---

## DEVELOPMENT WORKFLOW

### Quick Start

```bash
git clone https://github.com/varity-labs/generic-template-dashboard.git
cd generic-template-dashboard
npm install --legacy-peer-deps
npm run build
git add . && git commit -m "fix: description" && git push origin main
```

### Guardrails Enforcement

| When | What Runs | Blocks On Failure |
|------|-----------|:-----------------:|
| `git commit` | TypeScript + Build | YES |
| Push to main | Full CI Pipeline | YES |
| Pull Request | Full CI + E2E Tests | YES |

---

## FILE STRUCTURE

```
generic-template-dashboard/
├── .husky/pre-commit              # Pre-commit hooks
├── .github/workflows/ci.yml       # CI pipeline
├── tests/e2e/                     # Playwright tests
├── playwright.config.ts           # Playwright config
│
├── src/                           # Next.js 14 frontend
│   ├── app/
│   │   ├── dashboard/tools/[integration]/page.tsx  # NEEDS FIX: Live API
│   │   ├── analytics/             # MOCK DATA - needs fix
│   │   └── ...
│   ├── components/
│   │   ├── ai/                    # AI components (working)
│   │   ├── planning/              # Planning components (working)
│   │   └── integrations/          # Integration components (broken)
│   └── ...
│
├── backend/                       # FastAPI backend
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── integrations.py    # NEEDS FIX: Token refresh (lines 66-129)
│   │   │   ├── dashboard.py       # NEEDS FIX: KPI calculations
│   │   │   ├── ai.py              # Working
│   │   │   ├── planning.py        # Working
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── rag_service.py     # Working
│   │   │   └── ...
│   │   └── ...
│   └── ...
│
├── CLAUDE.md                      # This file (accurate as of Dec 30)
├── LIVE-UI-AUDIT-REPORT-DEC-30.md # Full audit findings
└── ...
```

---

## RECOMMENDATIONS FOR LAUNCH

### Option A: Honest MVP (Recommended)

**Remove all broken integrations. Ship only what works:**
- AI Chat (90% working)
- Planning (95% working)
- Slack (after frontend fix)
- "More integrations coming soon" banner

### Option B: Fix Top 3 Integrations

1. Fix OAuth refresh for all
2. Fix Slack completely (frontend + all tabs)
3. Fix Google Gmail + Calendar (live API)
4. Remove broken integrations

### Option C: Full Fix (Not Recommended Now)

Fix everything. But that's 6-8 weeks of work.

---

## CONCLUSION

**Stop:**
- Building new features
- Claiming things work
- Over-engineering

**Start:**
- Testing with real data
- Fixing OAuth first
- Implementing hybrid model in frontend
- Being honest in docs

**Focus on:**
- Make AI Chat the centerpiece (it's already great!)
- Get 1-2 integrations working PERFECTLY
- Remove broken features
- Ship something honest

---

## SUPPORT

- **Issues:** https://github.com/varity-labs/generic-template-dashboard/issues
- **Full Audit Report:** `LIVE-UI-AUDIT-REPORT-DEC-30.md`
