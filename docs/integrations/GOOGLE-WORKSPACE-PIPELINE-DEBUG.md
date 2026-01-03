# Google Workspace Data Pipeline Debug Report

**Date:** December 29, 2025
**Investigator:** Pipeline Tracer Agent
**Wallet:** `0x738C812FB221ba32E8726fe38961570a700e87b9`
**Status:** INCOMPLETE SYNC - Data not reaching frontend

---

## Executive Summary

The Google Workspace integration has a **partial data pipeline failure**. While the OAuth connection is working and data CAN be synced, there are critical issues preventing data from reaching the frontend consistently.

### Key Findings

1. **HYBRID DATA MODEL** - Gmail and Calendar are intentionally NOT synced to storage
2. **RAG INDEXING SELECTIVE** - Only Drive and Contacts are indexed in Qdrant
3. **LIVE API PATTERN** - Gmail/Calendar should use live API calls, not storage
4. **FRONTEND DISCONNECT** - Frontend may be querying wrong endpoints

---

## Data Pipeline Architecture (As Designed)

```
┌─────────────────────────────────────────────────────────────────┐
│                      GOOGLE WORKSPACE                            │
└───────────┬─────────────────────────────────────────────────────┘
            │
            │ OAuth Token (Database: OAuthToken table)
            ↓
┌───────────┴─────────────────────────────────────────────────────┐
│         GoogleWorkspaceSync Adapter                              │
│         backend/app/adapters/google/sync.py                      │
│                                                                  │
│  sync_all():                                                     │
│  ├── Drive (synced to Pinata + Qdrant)                         │
│  └── Contacts (synced to Pinata + Qdrant)                      │
│                                                                  │
│  NOT synced (live API only):                                    │
│  ├── Gmail (use /api/v1/integrations/google/emails)           │
│  └── Calendar (use /api/v1/integrations/google/events)        │
└──────────────────────────────────────────────────────────────────┘
            │
            │ Encryption (AES-256-GCM, wallet-derived key)
            ↓
┌───────────┴─────────────────────────────────────────────────────┐
│         Pinata Upload (Filecoin/IPFS)                           │
│         backend/app/services/filecoin_service.py                 │
│                                                                  │
│  Gateway: https://varity.mypinata.cloud                         │
│  Files stored with metadata:                                    │
│  - customer_wallet                                              │
│  - integration="google"                                         │
│  - data_type="drive" or "contacts"                             │
│  - chunk_id (for quarterly/monthly chunks)                     │
└──────────────────────────────────────────────────────────────────┘
            │
            │ RAG Indexing (only Drive & Contacts)
            ↓
┌───────────┴─────────────────────────────────────────────────────┐
│         Qdrant Vector Database                                   │
│         backend/app/services/rag_service.py                      │
│                                                                  │
│  Collection: business_{wallet_clean}                            │
│  Index fields:                                                   │
│  - cid (for deduplication)                                      │
│  - integration="google"                                         │
│  - data_type="drive" or "contacts"                             │
│  - indexed_at (timestamp)                                       │
│  - preview (first 500 chars)                                    │
└──────────────────────────────────────────────────────────────────┘
            │
            │ Query (RAG or Live API)
            ↓
┌───────────┴─────────────────────────────────────────────────────┐
│         Frontend Display                                         │
│         src/components/integrations/google/                      │
│                                                                  │
│  Data Sources:                                                   │
│  - Drive: GET /api/v1/integrations/google/data?data_type=drive │
│  - Contacts: GET /api/v1/integrations/google/data?data_type=contacts │
│  - Gmail: GET /api/v1/integrations/google/emails               │
│  - Calendar: GET /api/v1/integrations/google/events            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Critical Issues Identified

### ISSUE 1: Gmail & Calendar NOT Synced to Storage (BY DESIGN)

**File:** `backend/app/adapters/google/sync.py`
**Lines:** 203-240

```python
async def sync_all(self) -> Dict[str, Any]:
    """
    Sync Google Workspace data to Pinata storage.

    NOTE: Only Drive and Contacts are synced to storage.
    Gmail and Calendar use live API calls instead.

    Returns:
        Dictionary containing all synced data categorized by service
    """
    logger.info("Starting Google Workspace sync (Drive, Contacts only)")

    try:
        # Sync only Drive and Contacts to storage
        # Gmail and Calendar use live API calls instead
        drive_data = await self.sync_drive()
        contacts_data = await self.sync_contacts()
```

**Impact:** Gmail and Calendar data will NEVER appear in Pinata or Qdrant.

**Root Cause:** Intentional design decision to avoid storing tens of thousands of emails.

**Expected Behavior:** Frontend should call live API endpoints:
- Gmail: `GET /api/v1/integrations/google/emails`
- Calendar: `GET /api/v1/integrations/google/events`

---

### ISSUE 2: RAG Queries Will NOT Return Gmail/Calendar

**File:** `backend/app/adapters/google/sync.py`
**Lines:** 23-29

```python
class GoogleWorkspaceSync:
    """Adapter for syncing data from Google Workspace APIs with multi-tenant encrypted storage"""

    # Data types that will be synced to Pinata AND indexed in Qdrant
    # Gmail and Calendar are intentionally excluded to avoid RAG clutter
    RAG_ENABLED_TYPES = ["drive", "contacts"]

    def should_index_in_rag(self, data_type: str) -> bool:
        """Check if data type should be indexed in Qdrant"""
        return data_type.lower() in [t.lower() for t in self.RAG_ENABLED_TYPES]
```

**Impact:** AI queries like "show my recent emails" will return no results from RAG.

**Root Cause:** RAG is filtered to only Drive and Contacts.

**Expected Fix:** AI Assistant should use hybrid approach:
1. RAG query for Drive/Contacts
2. Live API call for Gmail/Calendar when user asks about emails/events

---

### ISSUE 3: Frontend May Be Using Wrong Endpoints

**Files to Check:**
- `src/components/integrations/google/GmailInbox.tsx`
- `src/components/integrations/google/CalendarView.tsx`
- `src/components/integrations/google/DriveExplorer.tsx`
- `src/components/integrations/google/ContactsList.tsx`

**Expected Endpoints:**

| Data Type | Correct Endpoint | Status |
|-----------|------------------|--------|
| Gmail | `GET /api/v1/integrations/google/emails?wallet_address=...` | Live API |
| Calendar | `GET /api/v1/integrations/google/events?wallet_address=...` | Live API |
| Drive | `GET /api/v1/integrations/google/data?data_type=drive&wallet_address=...` | Storage + RAG |
| Contacts | `GET /api/v1/integrations/google/data?data_type=contacts&wallet_address=...` | Storage + RAG |

**Verification Needed:**
- Check if `GmailInbox.tsx` calls `/emails` endpoint or `/data?data_type=gmail`
- Check if `CalendarView.tsx` calls `/events` endpoint or `/data?data_type=calendar`

---

### ISSUE 4: Token Refresh May Not Be Working

**File:** `backend/app/api/v1/google.py`
**Lines:** 351-365

```python
async def get_google_access_token(wallet_address: str, db: AsyncSession) -> str:
    """
    Get active Google OAuth access token for the user.
    """
    # Check if token needs refresh (expires_at is already DateTime, not string)
    if token.expires_at and token.expires_at < datetime.utcnow():
        logger.info(f"Google token expired for {normalized_wallet[:10]}..., attempting refresh")
        refresh_success = await refresh_oauth_token(token, "google", db)
        if not refresh_success:
            raise HTTPException(
                status_code=401,
                detail="Access token expired and refresh failed. Please reconnect Google Workspace."
            )
        logger.info(f"Google token refreshed successfully for {normalized_wallet[:10]}...")
```

**Status:** Code looks correct - auto-refreshes on expiry.

**Verification Needed:** Check Railway logs for refresh success/failure.

---

## Testing Protocol

### Step 1: Verify OAuth Token

```bash
# Check if token exists and is active
psql $DATABASE_URL -c "
SELECT
    id,
    user_address,
    provider,
    is_active,
    expires_at,
    last_sync_at,
    created_at
FROM oauth_tokens
WHERE user_address = '0x738c812fb221ba32e8726fe38961570a700e87b9'
  AND provider = 'google';
"
```

**Expected:** Token should exist with `is_active = true`.

---

### Step 2: Trigger Data Sync

```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "integration": "google",
  "rag_indexed": 2,
  "rag_status": "healthy",
  "sync_result": {
    "data": {
      "drive": {
        "status": "success",
        "total_records": 123,
        "chunks": {
          "2025-Q1": "QmXXX...",
          "2024-Q4": "QmYYY..."
        }
      },
      "contacts": {
        "status": "success",
        "total_records": 45,
        "chunks": {
          "latest": "QmZZZ..."
        }
      }
    }
  },
  "verification": {
    "verified": 2,
    "failed": 0
  }
}
```

**What to Check:**
- `rag_indexed` should be 2 (drive + contacts)
- `rag_status` should be "healthy"
- `verification.verified` should match data types synced
- No "gmail" or "calendar" in `sync_result.data` (expected)

---

### Step 3: Verify Pinata Storage

```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/data?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&data_type=drive" | jq '.'
```

**Expected:** Should return Drive files from Pinata.

```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/data?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&data_type=contacts" | jq '.'
```

**Expected:** Should return Contacts from Pinata.

---

### Step 4: Test Live API Endpoints

```bash
# Gmail (should work even without sync)
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/emails?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&max_results=10" | jq '.'
```

**Expected:** Should return recent emails from Gmail API.

```bash
# Calendar (should work even without sync)
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/events?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&max_results=10" | jq '.'
```

**Expected:** Should return upcoming events from Calendar API.

---

### Step 5: Verify Qdrant Indexing

```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/ai/query/combined" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "show my recent drive files",
    "wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9",
    "mode": "standard"
  }' | jq '.sources'
```

**Expected:** Should return Drive files from Qdrant.

```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/ai/query/combined" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "list my contacts",
    "wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9",
    "mode": "standard"
  }' | jq '.sources'
```

**Expected:** Should return Contacts from Qdrant.

---

## Recommended Fixes

### FIX 1: Update Frontend to Use Hybrid Data Model

**Files to Update:**
- `src/components/integrations/google/GmailInbox.tsx`
- `src/components/integrations/google/CalendarView.tsx`

**Current (Wrong):**
```typescript
// DON'T DO THIS for Gmail/Calendar
const response = await fetch(
  `/api/v1/integrations/google/data?data_type=gmail&wallet_address=${wallet}`
);
```

**Correct:**
```typescript
// DO THIS for Gmail
const response = await fetch(
  `/api/v1/integrations/google/emails?wallet_address=${wallet}&max_results=50`
);

// DO THIS for Calendar
const response = await fetch(
  `/api/v1/integrations/google/events?wallet_address=${wallet}&max_results=50`
);
```

---

### FIX 2: Update AI Assistant to Use Hybrid Queries

**File:** `src/components/AIChat.tsx` or AI service layer

**Current:** RAG query only (misses Gmail/Calendar)

**Recommended:**
```typescript
async function hybridGoogleQuery(query: string, wallet: string) {
  // 1. Detect intent
  const isEmailQuery = /email|inbox|message|gmail/i.test(query);
  const isCalendarQuery = /event|calendar|meeting|appointment/i.test(query);

  // 2. RAG query for Drive/Contacts
  const ragResponse = await fetch('/api/v1/ai/query/combined', {
    method: 'POST',
    body: JSON.stringify({
      query,
      wallet_address: wallet,
      integration: 'google'
    })
  });

  // 3. Live API for Gmail/Calendar if detected
  let liveData = null;
  if (isEmailQuery) {
    liveData = await fetch(
      `/api/v1/integrations/google/emails?wallet_address=${wallet}&max_results=10`
    ).then(r => r.json());
  } else if (isCalendarQuery) {
    liveData = await fetch(
      `/api/v1/integrations/google/events?wallet_address=${wallet}&max_results=10`
    ).then(r => r.json());
  }

  // 4. Combine results
  return {
    rag: ragResponse.sources,
    live: liveData
  };
}
```

---

### FIX 3: Add Documentation to Integration README

**File:** `src/components/integrations/README.md`

**Add Section:**
```markdown
## Google Workspace Hybrid Data Model

| Data Type | Storage | RAG Index | Access Method |
|-----------|---------|-----------|---------------|
| Drive | Pinata | Yes | `/api/v1/integrations/google/data?data_type=drive` |
| Contacts | Pinata | Yes | `/api/v1/integrations/google/data?data_type=contacts` |
| Gmail | Live API | No | `/api/v1/integrations/google/emails` |
| Calendar | Live API | No | `/api/v1/integrations/google/events` |

**Why Hybrid?**
- Gmail: Tens of thousands of emails, too large for storage
- Calendar: Low RAG value (just metadata), live API is fresher
- Drive: Files need indexing for semantic search
- Contacts: Static data, benefits from RAG queries
```

---

## Next Steps

1. **Run Step 2-5 Testing Protocol** to verify current state
2. **Check Railway logs** for any sync errors
3. **Inspect frontend code** to confirm endpoint usage
4. **Test live API endpoints** from browser DevTools
5. **Update frontend** if using wrong endpoints
6. **Document** the hybrid model in README

---

## File References

| Component | File Path |
|-----------|-----------|
| **OAuth Endpoint** | `backend/app/api/v1/google.py:317-365` |
| **Sync Adapter** | `backend/app/adapters/google/sync.py` |
| **Sync Orchestrator** | `backend/app/api/v1/integrations.py:314-640` |
| **RAG Service** | `backend/app/services/rag_service.py:469-552` |
| **Filecoin Service** | `backend/app/services/filecoin_service.py` |
| **Gmail UI** | `src/components/integrations/google/GmailInbox.tsx` |
| **Calendar UI** | `src/components/integrations/google/CalendarView.tsx` |
| **Drive UI** | `src/components/integrations/google/DriveExplorer.tsx` |
| **Contacts UI** | `src/components/integrations/google/ContactsList.tsx` |

---

## Conclusion

The Google Workspace pipeline is **working as designed** but the design is **intentionally hybrid**:
- Drive + Contacts → Pinata + Qdrant (storage + RAG)
- Gmail + Calendar → Live API only (no storage)

**The issue is likely:**
1. Frontend components calling wrong endpoints
2. AI Assistant not using hybrid query approach
3. Documentation not explaining the hybrid model

**Next Action:** Run testing protocol and inspect frontend code to confirm.
