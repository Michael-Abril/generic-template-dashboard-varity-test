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

## 🟠 INTEGRATION BLOCKERS

### QuickBooks - 403 Error
**Status:** BLOCKED - Cannot fix
**Issue:** Needs Intuit production approval for API access
**Workaround:** None - must apply for production credentials

### Microsoft 365 - OAuth Broken
**Status:** Needs investigation
**Issue:** OAuth flow completely broken
**Files:** `backend/app/api/v1/microsoft.py`, `backend/app/adapters/microsoft/`

### Salesforce - Untested
**Status:** Never verified
**Issue:** User testing with dev account needed

### HubSpot - Untested
**Status:** Never verified
**Issue:** User testing with free account needed

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

## 🟢 TECHNICAL DEBT (Lower Priority)

### Console.log Statements
**Location:** Throughout codebase
**Impact:** Production logging noise

### Missing TypeScript Types
**Location:** Various API responses
**Impact:** Reduced type safety

### Inconsistent Loading States
**Location:** Various components
**Impact:** Mixed spinners/skeletons UX

---

## INTEGRATION STATUS MATRIX

| Integration | OAuth | Page | RAG | Live API | Notes |
|-------------|:-----:|:----:|:---:|:--------:|-------|
| Google | ✅ | ⚠️ | ⚠️ | ⚠️ | Partially working |
| Slack | ✅ | ⚠️ | ⚠️ | ✅ | Mostly working |
| Microsoft | ❌ | ❌ | ❌ | ⚠️ | OAuth broken |
| QuickBooks | ✅ | ⚠️ | ❌ | ❌ | 403 blocked |
| Salesforce | ❓ | ❓ | ❌ | ❌ | Untested |
| HubSpot | ❓ | ❓ | ❌ | ❌ | Untested |
