# KNOWN ISSUES - Varity Dashboard
**Last Updated:** January 7, 2026 (Integration Validation - Live Testing)

> **VERIFIED:** This document reflects actual testing via direct API calls on January 5, 2026 with wallet `0x738C812FB221ba32E8726fe38961570a700e87b9`

---

## LATEST VALIDATION - January 5, 2026: Live Backend Testing

**Test Results Summary:**
- **Infrastructure:** ✅ All systems healthy (PostgreSQL, Redis, Pinata, RPC)
- **Slack Integration:** ✅ 70% working (OAuth connected, channels endpoint working)
- **Google Workspace:** ⚠️ 30% working (OAuth shows "not connected" but APIs return data)
- **Microsoft 365:** ❌ 20% working (OAuth connected but all endpoints return 500 errors)
- **QuickBooks:** ❌ 10% working (CRITICAL BUG: decrypt_file_with_wallet parameter mismatch)
- **Frontend Testing:** ⏸️ Pending (Browser MCP not available)

**New Critical Issues Discovered:**
1. **CRIT-NEW-001:** QuickBooks decrypt_file_with_wallet() parameter mismatch - BLOCKING
2. **CRIT-NEW-002:** Microsoft 365 all endpoints returning 500 Internal Server Error
3. **CRIT-NEW-003:** Google OAuth status shows "not connected" despite APIs returning data

---

## CRITICAL FIX - January 7, 2026: IntegrationHealthCards Endpoint Mismatch

**Fixed Issue:**
- **IntegrationHealthCards Component** - Called non-existent endpoints `/api/v1/integrations/status` and `/api/v1/oauth/tokens`

**Change Made:**
- Simplified to use existing `/api/v1/integrations/installed` endpoint
- Removed fallback logic and complex transformation code
- Removed unused `mapStatus` function
- Now directly maps API response to component state

**Files Changed:**
- `/src/components/dashboard/IntegrationHealthCards.tsx` - Lines 63-145 simplified

**Result:** Dashboard integration health cards now use correct endpoint and display accurate status.

---

## CRITICAL FIX - January 5, 2026: AI Assistant Data Pipeline

**Fixed Issues:**
1. **Integration Name Mismatch** - Pinata stored files with `google_workspace` but queries used `google` → Now handles name variants
2. **RAG Indexing Error** - Legacy adapter reference causing potential crashes → Removed, now indexes all data types
3. **Pinata Fallback Missing** - Context picker empty when Qdrant failed → Now always tries Pinata fallback

**Files Changed:**
- `/backend/app/services/filecoin_service.py` - Python-side integration name filtering with variants
- `/backend/app/api/v1/integrations.py` - Removed legacy adapter reference
- `/backend/app/api/v1/ai.py` - Enhanced Pinata fallback logic

**Result:** AI Assistant Context Picker should now show connected integrations and their data.

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

**Status:** PARTIAL FIX IN PROGRESS

**FIXED (January 4, 2026):**
- ✅ Microsoft OneDriveExplorer now calls live API (`/api/v1/integrations/microsoft/onedrive/files`)
- ✅ Added loading states and error handling with props fallback
- ✅ Follows same pattern as GmailInbox (fetch on mount, fallback to props on error)

**FIXED (January 5, 2026) - Component Audit COMPLETED:**
- ✅ Google DriveExplorer calls live API (`/api/v1/integrations/google/files`) - Lines 224-296
- ✅ Google ContactsList calls live API (`/api/v1/integrations/google/contacts`) - Lines 93-149
- ✅ QuickBooks InvoicesList calls live API (`/api/v1/quickbooks/invoices`) - Lines 68-99
- ✅ QuickBooks CustomersList calls live API (`/api/v1/quickbooks/customers`) - Lines 67-98
- ✅ QuickBooks ExpensesList calls live API (`/api/v1/quickbooks/expenses`) - Lines 53-84
- ✅ QuickBooks VendorsList calls live API (`/api/v1/quickbooks/vendors`) - Lines 64-95

**Still Needs Fix:**
- SlackPage components (channels, messages, users)
- Other Microsoft components (Mail, Calendar, Tasks, Contacts)
- Salesforce components
- HubSpot components

### CRIT-003: Dashboard KPIs Show Wrong/Fake Data

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

**Location:** `backend/app/api/v1/dashboard.py`
**Status:** HIGH - Users see wrong numbers, trust destroyed

### CRIT-004: Analytics Page 100% Mock Data ✅ FIXED (January 7, 2026)

**Location:** `/analytics`
**Impact:** Page displays charts with completely fake data

**Fix Applied:**
- Widget rendering now prioritizes real data from `analyticsData.metrics` when available
- Demo data fallback now shows clear "Demo Data" badge in amber on all KPI/table/list widgets
- Empty state shows helpful message linking to Marketplace when no integrations connected
- Changed from using mock data by default to using real backend data first

**Files Changed:**
- `/src/components/pages/AnalyticsContent.tsx` - Lines 525-617 (renderWidget function)
- Lines 794-843 (empty state with integration count)

**Result:** Users now see either real data (when integrations connected) or clearly labeled demo data with helpful guidance.

---

## NEW CRITICAL BUGS - January 5, 2026 Live Testing

### CRIT-NEW-001: QuickBooks decrypt_file_with_wallet() Parameter Mismatch 🔴

**Severity:** CRITICAL - BLOCKING entire QuickBooks integration
**Endpoint:** `/api/v1/quickbooks/invoices` (and likely all QuickBooks endpoints)

**Error:**
```json
{"detail": "Failed to retrieve invoices: decrypt_file_with_wallet() got an unexpected keyword argument 'encrypted_data'"}
```

**Impact:** Complete QuickBooks integration failure - ALL data endpoints non-functional

**Root Cause:** Function signature mismatch in encryption service. The function is being called with `encrypted_data=X` parameter but the function definition doesn't accept this parameter name.

**Files to Fix:**
1. `/backend/app/services/encryption_service.py` - Check function signature
2. `/backend/app/api/v1/quickbooks.py` - Check all call sites
3. Likely need to change parameter name from `encrypted_data` to `data` or add parameter to function

**Fix Complexity:** LOW (simple parameter rename)
**Priority:** IMMEDIATE - easiest fix with biggest impact

---

### CRIT-NEW-002: Microsoft 365 All Endpoints Return 500 Errors 🔴

**Severity:** HIGH - Entire Microsoft 365 integration non-functional
**Endpoints Affected:**
- `/api/v1/integrations/microsoft/mail/messages` → 500 error
- `/api/v1/integrations/microsoft/calendar/events` → 500 error

**OAuth Status:** ✅ Connected (Jan 3, 2026) with valid refresh token

**Error Response:**
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please contact support if the issue persists.",
  "support": "support@varity.xyz"
}
```

**Possible Causes:**
1. Timezone mismatch in token refresh (commit 32a4a70 should have fixed this - verify deployed)
2. Microsoft API rate limiting or quota exceeded
3. Missing OAuth scopes in token
4. Unhandled Python exception in adapter code

**Next Steps:**
1. Check Railway logs for Python stack traces
2. Verify commit 32a4a70 was deployed to production
3. Test token refresh manually
4. Add better error handling to return specific error messages

**Fix Complexity:** MEDIUM (need to debug logs)
**Priority:** HIGH

---

### CRIT-NEW-003: Google OAuth Status Mismatch ⚠️

**Severity:** MEDIUM - Confusing UX, frontend may not call endpoints

**Issue:** OAuth status endpoint reports "No OAuth credentials found" but data endpoints successfully return real data.

**Evidence:**
- OAuth Status: `{"connected": false, "message": "No OAuth credentials found"}`
- Emails Endpoint: ✅ Returns 20 recent emails with full metadata
- Files Endpoint: ✅ Returns 50+ Drive files (3PL Comparison, Marketing Plan, etc.)
- Events Endpoint: ✅ Returns empty array (no events scheduled)

**Impact:**
- Frontend may skip calling data endpoints thinking OAuth is disconnected
- Users see confusing "reconnect" messages when data actually works
- Context selector may show empty when data is available

**Possible Causes:**
1. OAuth status endpoint checks database instead of Pinata
2. Token refresh updates Pinata but not database status
3. Status endpoint doesn't recognize refreshed tokens as valid

**Fix Complexity:** LOW (update status endpoint logic)
**Priority:** MEDIUM

---

## INTEGRATION STATUS (Updated - January 5, 2026)

| Integration | OAuth Status | Live API Backend | Data Retrieved | Frontend | Overall |
|-------------|:------------:|:----------------:|:--------------:|:--------:|:-------:|
| **Slack** | ✅ Connected | ✅ Working | 2 channels | Unknown | **70%** |
| **Google** | ⚠️ Shows "not connected" | ✅ Working | 20 emails, 50+ files | Unknown | **30%** |
| **Microsoft** | ✅ Connected | ❌ 500 errors | None | Unknown | **20%** |
| **QuickBooks** | ✅ Connected | ❌ decrypt bug | None | Unknown | **10%** |
| **Salesforce** | Unknown | Unknown | Unknown | Unknown | **?** |
| **HubSpot** | Unknown | Unknown | Unknown | Unknown | **?** |

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
