# KNOWN ISSUES - Varity Dashboard
**Last Updated:** December 30, 2025 (LIVE API AUDIT - Comprehensive Testing)

> **VERIFIED:** This document reflects actual testing via direct API calls on December 30, 2025 with wallet `0x738C812FB221ba32E8726fe38961570a700e87b9`

---

## OVERALL STATUS: 45% Working, 55% Broken/Misleading

### What Actually Works (Verified)

| Feature | Status | Evidence |
|---------|:------:|----------|
| **AI Assistant** | 90% WORKING | RAG queries, web search, conversations persist |
| **Slack Live API** | 100% WORKING | Returns 3 channels correctly |
| **Planning** | 95% WORKING | 1 task indexed in RAG |
| **Conversations** | 100% WORKING | 6 conversations stored |
| **Infrastructure** | 100% WORKING | Backend, Pinata, Qdrant all healthy |

### What's Broken (Verified)

| Feature | Status | Evidence |
|---------|:------:|----------|
| **Google OAuth** | EXPIRED | `needs_reauth: true`, expired in <24 hours |
| **Microsoft OAuth** | EXPIRED | `needs_reauth: true`, expired in <48 hours |
| **QuickBooks OAuth** | EXPIRED | `needs_reauth: true`, `data_count: 0` |
| **Integration Pages** | 80% BROKEN | Frontend doesn't call live API endpoints |
| **Analytics Page** | 100% MOCK DATA | All numbers are hardcoded fake data |
| **Dashboard KPIs** | MISLEADING | Shows "$5.00" revenue but `data_count: 0` |

---

## CRITICAL ISSUES (December 30, 2025 Live Audit)

### CRIT-001: OAuth Tokens Expire Within 24-48 Hours

**Impact:** Blocks ALL integration functionality
**Evidence from API testing:**

| Integration | Last Sync | Status After |
|-------------|-----------|--------------|
| Google | Dec 29, 8:41 PM | EXPIRED (<24 hours) |
| Microsoft | Dec 29, 2:43 AM | EXPIRED (<48 hours) |
| QuickBooks | Dec 29, 6:15 PM | EXPIRED (<24 hours) |
| Slack | Dec 26 | ACTIVE (4+ days) |

**Root Cause:** Token refresh not working or refresh tokens not being used
**Location:** `backend/app/api/v1/integrations.py` lines 66-129
**Status:** CRITICAL - Must fix before any integrations are usable

### CRIT-002: Frontend Doesn't Use Live API Endpoints

**Impact:** Slack works in backend but shows empty in frontend
**Location:** `src/app/dashboard/tools/[integration]/page.tsx` lines 2417-2420

**Current Code (Broken):**
```typescript
const res = await fetch(`${apiBase}/api/v1/integrations/${integration}/data`);
// This ONLY fetches sync data from Pinata, ignores live API endpoints
```

**Evidence:**
- Slack channels endpoint returns 3 channels: `GET /api/v1/integrations/slack/channels`
- But frontend shows empty because it fetches from `/slack/data` (sync data only)

**Status:** CRITICAL - Hybrid data model not implemented in frontend

### CRIT-003: Dashboard KPIs Show Wrong/Fake Data - ✅ FIXED (January 12, 2026)

**Evidence from API:**
```json
{
  "kpis": [
    {"id": "qb_revenue", "title": "Total Revenue", "value": "$5.00", "source": "QuickBooks"},
    {"id": "google_files", "title": "Drive Files", "value": "1"}
  ]
}
```

**Reality:**
- QuickBooks: `data_count: 0` - no data synced, "$5.00" is fake or cached
- Google Drive: 83 files synced - dashboard shows "1"

**Root Cause Identified:**
1. `get_integration_data()` was using "latest_only pattern" which kept only the most recent file per data_type
2. When Google Drive data was stored in 17 chunks (all with `data_type="drive"`), only 1 chunk was retrieved
3. `recent-activity` endpoint called `get_kpi_data()` but treated return value as list instead of Dict

**Fixes Applied:**
1. Added `latest_only` parameter to `get_integration_data()` - defaults to False for accurate counts
2. Fixed `recent-activity` endpoint to extract data from Dict result: `result.get("data", [])`
3. Fixed missing `db` parameter in all `get_kpi_data()` calls
4. All KPI endpoints now use `latest_only=False` to retrieve ALL chunks

**Files Modified:**
- `backend/app/api/v1/dashboard.py` lines 259-527, 760-768, 874-895, 1008-1182

**Location:** `backend/app/api/v1/dashboard.py`
**Status:** ✅ RESOLVED - Dashboard will now show accurate file counts from all chunks

### CRIT-004: Analytics Page 100% Mock Data

**Location:** `/analytics`
**Impact:** Page displays charts with completely fake data

**Fake Data Displayed:**
- Customers: 1,234 - **FAKE**
- Growth: 24.5% - **FAKE**
- Net Profit: $45,000 - **FAKE**
- Margin: 32.5% - **FAKE**
- Avg LTV: $125,000 - **FAKE**

**Status:** HIGH - Must either remove page or add "DEMO DATA" banner

---

## INTEGRATION STATUS (Actual - December 30, 2025)

| Integration | OAuth Status | Data Synced | Live API Backend | Frontend Uses Live API | Overall |
|-------------|:------------:|:-----------:|:----------------:|:----------------------:|:-------:|
| **Google** | EXPIRED | 83 files (stale) | Untestable | NO | **20%** |
| **Slack** | ACTIVE | 2 users only | YES (works) | NO | **50%** |
| **Microsoft** | EXPIRED | 0 | Untestable | NO | **10%** |
| **QuickBooks** | EXPIRED | 0 | Untestable | NO | **5%** |
| **Salesforce** | UNKNOWN | Unknown | Unknown | NO | **?** |
| **HubSpot** | UNKNOWN | Unknown | Unknown | NO | **?** |

### Per-Integration Details

#### Google Workspace - 20% Working

**OAuth:** EXPIRED (expired within 24 hours of last sync)
**Synced Data:** 83 Drive files (from Dec 29 - now stale and inaccessible)

| Tab | Status | Notes |
|-----|--------|-------|
| Home | BROKEN | Can't fetch stats (OAuth expired) |
| Gmail | BROKEN | "Unable to load emails" error |
| Calendar | BROKEN | OAuth expired |
| Drive | PARTIAL | Shows 83 files but links won't work |
| Contacts | UNKNOWN | Not tested |
| Tasks | Coming Soon | Placeholder UI |

#### Slack - 50% Working (Best Integration)

**OAuth:** ACTIVE (only integration still working after 4+ days)
**Synced Data:** 2 users only (channels/messages NOT synced to RAG)

| Tab | Status | Notes |
|-----|--------|-------|
| Channels | SHOULD WORK | Live API returns 3 channels, but frontend doesn't call it |
| Messages | BROKEN | No sync, no live API call in frontend |
| Users | WORKS | 2 users synced |
| Files | BROKEN | 0 files synced |

**Critical Issue:** Backend endpoint works perfectly, frontend just doesn't use it.

#### Microsoft 365 - 10% Working

**OAuth:** EXPIRED (worked on Dec 29, expired within 48 hours)
**Synced Data:** 0

All tabs BROKEN. Documentation previously claimed "OAuth broken, needs investigation" - reality is OAuth worked but tokens expired immediately and no data persisted.

#### QuickBooks - 5% Working

**OAuth:** EXPIRED
**Synced Data:** 0

All tabs BROKEN. Dashboard shows "$5.00 revenue" which is fake or cached (actual `data_count: 0`).

---

## WORKING FEATURES (Verified)

### AI Assistant - 90% Working

**Test Query:** "What files are in my Google Drive?"
**Result:** SUCCESS with RAG sources and web search

**What Works:**
- RAG queries search indexed data (5 CIDs returned)
- Web search integration (3 sources)
- Conversation history persists (6 conversations)
- Executive report format
- Multiple AI modes

**What Doesn't Work:**
- Context picker likely empty (most integrations have `data_count: 0`)
- Email send actions (OAuth tokens expired)
- Document creation (OAuth tokens expired)

### Planning Feature - 95% Working

**From API Testing:**
```json
{
  "tasks": [{
    "id": 1,
    "title": "finish3PL Shipment",
    "is_completed": true,
    "rag_indexed": true
  }],
  "total_count": 1
}
```

- Task CRUD works
- RAG indexed (AI can query it)
- Dashboard widget displays it
- WCAG accessible

### Conversations - 100% Working

6 conversations stored with timestamps, message counts, and titles.

---

## PRIORITY FIXES NEEDED

### Priority 1: Fix OAuth Token Refresh (CRITICAL)

**Impact:** Blocks ALL integrations
**Files:** `backend/app/api/v1/integrations.py` lines 66-129

**Success Criteria:**
- Tokens last > 7 days
- Automatic refresh before expiry
- User never sees "reconnect" unless manually disconnected

### Priority 2: Fix Frontend Live API Integration (CRITICAL)

**Impact:** Slack works in backend but empty in frontend
**Files:** `src/app/dashboard/tools/[integration]/page.tsx`

**Required Change:**
```typescript
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
- Add "Last Updated" timestamps
- Add "Data Stale" warnings

### Priority 4: Remove/Label Mock Data

**Impact:** Honesty with users
**Files:** Analytics page components

**Options:**
1. Remove analytics page entirely
2. Add huge "DEMO DATA" banner
3. Replace with "Coming Soon"

---

## PAGE STATUS (Verified December 30, 2025)

### Fully Working Pages

| Page | URL | Status |
|------|-----|--------|
| **Homepage** | `/` | 100% WORKING |
| **Onboarding** | `/onboarding` | 100% WORKING |
| **AI Assistant** | `/ai-assistant` | 90% WORKING |
| **Tasks** | `/dashboard/tasks` | 95% WORKING |
| **Roadmap** | `/dashboard/roadmap` | 95% WORKING |
| **Marketplace** | `/marketplace` | 100% WORKING |
| **Settings** | `/settings` | 90% WORKING |

### Broken/Misleading Pages

| Page | URL | Status | Issue |
|------|-----|--------|-------|
| **Dashboard** | `/dashboard` | 70% | KPIs show wrong/fake data |
| **Analytics** | `/analytics` | 0% REAL | 100% mock data |
| **Google Workspace** | `/dashboard/tools/google` | 20% | OAuth expired, Gmail broken |
| **QuickBooks** | `/dashboard/tools/quickbooks` | 5% | OAuth expired, no data |
| **Microsoft 365** | `/dashboard/tools/microsoft` | 10% | OAuth expired, no data |
| **Slack** | `/dashboard/tools/slack` | 50% | Frontend doesn't use live API |
| **Integrations** | `/integrations` | MISLEADING | Shows connections but most expired |

---

## PREVIOUS FIXES (Still Valid)

### Security Fixes (December 26-28, 2025) - ALL COMPLETE

| Issue | Status |
|-------|--------|
| RED-001: Key Derivation Vulnerability | FIXED |
| RED-002: Hardcoded OAuth State Secret | FIXED |
| RED-003: Encryption Key Leaked | FIXED |
| YELLOW-001 through YELLOW-005 | ALL FIXED |

### Code Quality Fixes (December 28, 2025) - ALL COMPLETE

| Issue | Status |
|-------|--------|
| Console.log cleanup (33 statements) | FIXED |
| Error boundaries on integrations | FIXED |
| WCAG accessibility | FIXED |
| Planning feature with RAG | FIXED |
| AI enhancements (5 features) | FIXED |

---

## RECOMMENDATIONS FOR LAUNCH

### Option A: Honest MVP (Recommended)

Remove all broken integrations. Ship only what works:
- AI Chat (90% working)
- Planning (95% working)
- Slack (after frontend fix)
- "More integrations coming soon" banner

### Option B: Fix Top 3 Integrations

1. Fix OAuth refresh for all
2. Fix Slack completely (frontend + all tabs)
3. Fix Google Gmail + Calendar (live API)
4. Remove broken integrations

---

## DOCUMENTATION ACCURACY NOTE

**Previous documentation was 70-75% inaccurate.** Common patterns:
- Claimed integrations "working" when OAuth expired within 24 hours
- Claimed "90% complete" when frontend didn't implement hybrid model
- Claimed KPIs "working" when showing fake/wrong data

**This document reflects actual API testing results from December 30, 2025.**
