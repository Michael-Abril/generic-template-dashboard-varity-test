# KNOWN ISSUES - Varity Dashboard
**Last Updated:** December 26, 2025

---

## 🔴 CRITICAL SECURITY (MUST FIX BEFORE LAUNCH)

### RED-001: Key Derivation Vulnerability
**File:** `backend/app/services/encryption_service.py:209-234`
**Issue:** Uses PUBLIC wallet address for key derivation - anyone can derive the key
**Impact:** All encrypted data can be decrypted by attackers
**Fix Required:** Require wallet SIGNATURE during account creation, use signature as key derivation input

### RED-002: Hardcoded OAuth State Secret
**File:** `backend/app/api/v1/oauth.py:60`
**Issue:** OAuth state secret is hardcoded in source code
**Impact:** Attackers can hijack OAuth flows
**Fix Required:** Move to environment variable

### RED-003: Encryption Key Leaked in Response
**File:** `backend/app/services/encryption_service.py:404-406`
**Issue:** Encryption key returned in API response
**Impact:** Aids key recovery attacks
**Fix Required:** Remove key from response

---

## 🟡 HIGH PRIORITY SECURITY

### YELLOW-001: OAuth Tokens Decryptable
**File:** `backend/app/models/purchase.py:141-176`
**Issue:** OAuth tokens can be decrypted without authentication

### YELLOW-002: Most API Endpoints Exempt from Auth
**File:** `backend/app/middleware/auth.py:61-82`
**Issue:** Many endpoints don't require authentication
**Fix Required:** Review and enable auth on all endpoints

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
