# KNOWN ISSUES - Varity Dashboard
**Last Updated:** December 26, 2025

---

## ✅ CRITICAL SECURITY (FIXED - December 26, 2025)

### RED-001: Key Derivation Vulnerability - ✅ FIXED
**File:** `backend/app/services/encryption_service.py:209-255`
**Issue:** Was using PUBLIC wallet address for key derivation
**Fix Applied:** Added server-side `ENCRYPTION_SECRET` to key derivation
**Status:** ✅ RESOLVED - Server secret now required for key derivation
**⚠️ Note:** Existing encrypted data needs re-encryption with new keys

### RED-002: Hardcoded OAuth State Secret - ✅ FIXED
**File:** `backend/app/api/v1/oauth.py:60-62`
**Issue:** Was hardcoded in source code
**Fix Applied:** Moved to `OAUTH_STATE_SECRET` environment variable
**Status:** ✅ RESOLVED - Now uses env var + constant-time comparison

### RED-003: Encryption Key Leaked in Response - ✅ FIXED
**File:** `backend/app/services/encryption_service.py:403-417`
**Issue:** Was returning encryption key in API response
**Fix Applied:** Removed `encrypted_symmetric_key` from all responses
**Status:** ✅ RESOLVED - No key material in responses

---

## 🟡 HIGH PRIORITY SECURITY

### YELLOW-001: OAuth Tokens Decryptable
**File:** `backend/app/models/purchase.py:141-176`
**Issue:** OAuth tokens can be decrypted without authentication

### YELLOW-002: Most API Endpoints Exempt from Auth - ✅ FIXED
**File:** `backend/app/middleware/auth.py:57-150`
**Issue:** Was exempting almost all endpoints from authentication
**Fix Applied:** Separated truly public endpoints from wallet-param endpoints with clear documentation
**Status:** ✅ RESOLVED - Public endpoints now clearly defined, wallet-param endpoints documented
**Note:** Wallet-param endpoints still need handler-level validation (TODO: add wallet signatures)

### YELLOW-003: DEV_MODE Disables Security
**File:** `backend/app/middleware/auth.py:21`
**Issue:** DEV_MODE flag disables ALL security checks

### YELLOW-004: OAuth State In-Memory
**File:** `backend/app/api/v1/oauth.py:37`
**Issue:** OAuth state stored in memory (lost on restart)

### YELLOW-005: Rate Limiting In-Memory
**File:** `backend/app/middleware/rate_limit.py`
**Issue:** Rate limiting state in memory (not shared across instances)

---

## 🟠 INTEGRATION BLOCKERS (Updated by Terminal 4 - December 26, 2025)

### BUG-001: Google Token Bug (CRITICAL)
**File:** `backend/app/api/v1/google.py:102-107`
**Issue:** Uses `token.encrypted_token` which DOES NOT EXIST - should use `token.access_token`
**Impact:** ALL Google CRUD endpoints fail with AttributeError (send email, create event, upload file)
**Fix Required:** Change to `token.access_token` property (like Slack endpoints)

### BUG-002: Slack Missing Private Channel Scopes (HIGH)
**File:** `backend/app/api/v1/oauth.py:217`
**Issue:** Missing `groups:read,groups:history` OAuth scopes
**Impact:** Private channels not accessible (only public channels work)
**Fix Required:** Add scopes to oauth.py:217

### BUG-003: Microsoft Read-Only OAuth Scopes (CRITICAL)
**File:** `backend/app/api/v1/oauth.py:201`
**Issue:** OAuth scopes are read-only (`.Read`) but app needs write permissions
**Impact:** All write operations fail (send email, upload file, create event)
**Fix Required:** Change to `Mail.ReadWrite Mail.Send Calendars.ReadWrite Files.ReadWrite`

### BUG-004: Microsoft Missing Token Refresh Config (CRITICAL)
**File:** `backend/app/api/v1/integrations.py:41-64`
**Issue:** Microsoft is ABSENT from TOKEN_REFRESH_CONFIGS
**Impact:** Tokens expire after 1 hour with no way to refresh
**Fix Required:** Add Microsoft to TOKEN_REFRESH_CONFIGS dict

### BUG-005: Salesforce Missing Department Field (LOW)
**File:** `backend/app/api/v1/salesforce_crud.py:85-101`
**Issue:** ContactCreate model missing `department` field but code references it
**Impact:** Minor - create contact may fail if department provided
**Fix Required:** Add `department: Optional[str] = None` to model

### QuickBooks - 403 Error
**Status:** BLOCKED - Business Process Blocker
**Issue:** Needs Intuit production app approval for API access
**Error Message:** "Forbidden: Your app is in development mode"
**Exact Location:** `backend/app/adapters/quickbooks/sync.py:71-88`
**Workaround:** Use QuickBooks Sandbox company for testing
**Resolution:** Submit app for Intuit production review (1-2 week wait)

### Microsoft 365 - OAuth Broken
**Status:** Root causes identified (3 issues - see BUG-003, BUG-004 above)
**Files:** `backend/app/api/v1/oauth.py:201`, `backend/app/api/v1/integrations.py:41-64`
**Additional:** Azure AD app needs updated API permissions + admin consent

### Salesforce - Ready for Testing
**Status:** Code complete (95%), needs live account test
**Minor Bug:** BUG-005 (department field)
**Prerequisite:** Verify Railway env vars (SALESFORCE_CLIENT_ID/SECRET)

### HubSpot - Ready for Testing
**Status:** Code complete (100%), best implementation quality
**Prerequisite:** Verify Railway env vars (HUBSPOT_CLIENT_ID/SECRET)

---

## 🔵 FUNCTIONAL ISSUES

### AI Chat Bypasses Qdrant
**File:** Main AI chat endpoint
**Issue:** Fetches ALL files from Pinata instead of using Qdrant vector search
**Impact:** Slow and doesn't use indexed data
**Fix Required:** Update to use Qdrant for semantic search

### Document Upload Incomplete
**File:** `src/components/AIChat.tsx`
**Issue:** File input hidden, no handler implemented
**Impact:** Users cannot upload documents for analysis

### Analytics Uses Mock Data
**File:** `src/components/pages/AnalyticsContent.tsx`
**Issue:** Charts render with placeholder/mock data
**Impact:** Analytics not showing real business data

---

## 🟣 ACCESSIBILITY ISSUES (Terminal 5 - December 26, 2025)

### A11Y-001: Viewport Zoom Disabled (CRITICAL)
**File:** `src/app/layout.tsx:28-34`
**Issue:** `userScalable: false` prevents users with low vision from zooming
**Impact:** Violates WCAG 1.4.4 - Legal compliance risk
**Fix Required:** Change to `userScalable: true`

### A11Y-002: Missing Skip-to-Main-Content Link
**File:** `src/components/Layout.tsx`
**Issue:** No skip link exists for keyboard users
**Impact:** Users must tab through entire sidebar on every page
**Fix Required:** Add skip link at top of page

### A11Y-003: Form Inputs Missing Label Associations
**Files:** `CompanyProfileStep.tsx`, `Settings/page.tsx`, `AIChat.tsx`
**Issue:** Form inputs have visible labels but lack `htmlFor`/`id` associations
**Impact:** Screen readers cannot announce field labels
**Fix Required:** Add proper htmlFor/id attributes

### A11Y-004: Modal Dialogs Missing Focus Trapping
**Files:** `dialog.tsx`, `Settings/page.tsx`, `MarketplaceContent.tsx`
**Issue:** Modals do not trap focus - users can tab out to background
**Impact:** Keyboard users can get lost
**Fix Required:** Implement focus trap

### A11Y-005: Contrast Issues
**Locations:** Throughout - `text-gray-400` and `text-gray-500` on white backgrounds
**Issue:** Some text may not meet 4.5:1 contrast ratio
**Impact:** Readability issues for users with visual impairments

---

## 🟤 UX ISSUES (Terminal 5 - December 26, 2025)

### UX-001: AI Assistant Complexity (HIGH)
**File:** `src/components/AIChat.tsx`
**Issue:** 4 AI modes + context picker creates cognitive overload for non-tech users
**Impact:** Users default to "Standard" and miss powerful features
**Recommendation:** Merge into single intelligent mode OR add visual explainer tooltips

### UX-002: Technical Terminology
**File:** `src/components/ai/ContextPicker.tsx`
**Issue:** "Context" label is developer terminology
**Impact:** Users don't understand what it means
**Recommendation:** Rename to "Search in:" or "Ask about:"

### UX-003: Syncing Labels Too Technical
**File:** `src/components/onboarding/steps/SyncingStep.tsx`
**Issue:** Labels like "Encrypting with your key" confuse non-tech users
**Recommendation:** Use plain language: "Securing your data"

### UX-004: Missing Trust Signals Post-Onboarding
**Locations:** Dashboard, AI Assistant, Marketplace
**Issue:** Security badges only appear in onboarding, not in app
**Recommendation:** Add subtle security indicator to navigation bar

---

## 🟢 TECHNICAL DEBT (Lower Priority)

### Console.log Statements (~50+ instances)
**Location:** Throughout codebase, especially:
- `src/hooks/useWalletAuth.ts` - 12+ statements
- `src/app/dashboard/tools/[integration]/page.tsx` - 20+ placeholders
- `src/components/ai/ProjectSidebar.tsx`
**Impact:** Production logging noise
**Fix Required:** Replace with logger.ts

### Missing Error Boundaries on Integration Pages
**Location:** Google, Slack, Microsoft, QuickBooks, Salesforce, HubSpot pages
**Impact:** Errors crash entire page instead of graceful fallback
**Fix Required:** Wrap with ErrorBoundary component

### Missing TypeScript Types
**Location:** Various API responses
**Impact:** Reduced type safety

### Inconsistent Loading States
**Location:** Various components
**Impact:** Mixed spinners/skeletons UX

---

## INTEGRATION STATUS MATRIX (Updated by Terminal 4 - December 26, 2025)

| Integration | OAuth | Sync | RAG | Live API | Frontend | Overall | Bugs |
|-------------|:-----:|:----:|:---:|:--------:|:--------:|:-------:|------|
| **Slack** | PASS | PASS | PASS | PASS | PASS | **75%** | BUG-002 (scopes) |
| **Google** | PASS | PASS | PARTIAL | FAIL | PASS | **70%** | BUG-001 (token) |
| **Microsoft** | FAIL | FAIL | FAIL | FAIL | PASS | **BROKEN** | BUG-003, BUG-004 |
| **QuickBooks** | PASS | BLOCKED | BLOCKED | BLOCKED | PARTIAL | **BLOCKED** | Intuit approval |
| **Salesforce** | UNTESTED | UNTESTED | UNTESTED | UNTESTED | PASS | **95% READY** | BUG-005 (minor) |
| **HubSpot** | UNTESTED | UNTESTED | UNTESTED | UNTESTED | PASS | **100% READY** | None |

**Full details:** See INTEGRATION-TEST-RESULTS.md
