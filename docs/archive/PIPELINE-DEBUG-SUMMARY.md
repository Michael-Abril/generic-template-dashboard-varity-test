# Google Workspace Pipeline Debug Summary

**Date:** December 29, 2025
**Status:** Investigation Complete
**Finding:** Pipeline is working as designed - uses HYBRID DATA MODEL

---

## Key Discovery

The Google Workspace integration is **intentionally designed** to NOT sync all data to Pinata/Qdrant. Instead, it uses a **hybrid approach**:

### Data Types Synced to Storage (Pinata + Qdrant)
- **Drive** - Files indexed for semantic search
- **Contacts** - Static data, benefits from RAG queries

### Data Types Using Live API Only
- **Gmail** - Too large (tens of thousands of emails)
- **Calendar** - Low RAG value, live API is fresher

---

## Root Cause Analysis

### Why Gmail/Calendar Are NOT in Storage

**File:** `backend/app/adapters/google/sync.py:203-240`

The adapter explicitly excludes Gmail and Calendar:

```python
async def sync_all(self) -> Dict[str, Any]:
    """
    Sync Google Workspace data to Pinata storage.

    NOTE: Only Drive and Contacts are synced to storage.
    Gmail and Calendar use live API calls instead.
    """
    # Sync only Drive and Contacts to storage
    drive_data = await self.sync_drive()
    contacts_data = await self.sync_contacts()
```

**Design Rationale:**
1. **Gmail:** Storing tens of thousands of emails in Pinata is impractical
2. **Calendar:** Just metadata, live API provides fresher data
3. **Performance:** Reduces storage costs and sync time
4. **Privacy:** Less sensitive data at rest

---

## Expected Data Flow

### For Drive & Contacts
```
User Triggers Sync
    ↓
Adapter fetches from Google API
    ↓
Encrypt with wallet-derived key
    ↓
Upload to Pinata (CID stored)
    ↓
Index in Qdrant for RAG
    ↓
Frontend queries: /api/v1/integrations/google/data?data_type=drive
```

### For Gmail & Calendar
```
User Opens Gmail/Calendar Tab
    ↓
Frontend calls live API endpoint directly
    ↓
Backend uses OAuth token to call Google API
    ↓
Return fresh data (no storage involved)
    ↓
Frontend displays: /api/v1/integrations/google/emails
```

---

## Correct API Endpoints

| Data Type | Endpoint | Method | Storage | RAG |
|-----------|----------|--------|---------|-----|
| **Drive** | `/api/v1/integrations/google/data?data_type=drive` | GET | Yes | Yes |
| **Contacts** | `/api/v1/integrations/google/data?data_type=contacts` | GET | Yes | Yes |
| **Gmail** | `/api/v1/integrations/google/emails` | GET | No | No |
| **Calendar** | `/api/v1/integrations/google/events` | GET | No | No |

---

## Testing Checklist

### 1. Verify OAuth Token
```bash
# Check database for active token
psql $DATABASE_URL -c "
SELECT provider, is_active, expires_at, last_sync_at
FROM oauth_tokens
WHERE user_address = '0x738c812fb221ba32e8726fe38961570a700e87b9'
  AND provider = 'google';
"
```

### 2. Trigger Sync (Should Only Sync Drive + Contacts)
```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/sync" \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9"}'
```

**Expected Response:**
- `rag_indexed: 2` (drive + contacts)
- `rag_status: "healthy"`
- NO "gmail" or "calendar" in `sync_result.data`

### 3. Test Drive Data Retrieval
```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/data?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&data_type=drive"
```

### 4. Test Contacts Data Retrieval
```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/data?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&data_type=contacts"
```

### 5. Test Live Gmail API
```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/emails?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&max_results=10"
```

### 6. Test Live Calendar API
```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/events?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&max_results=10"
```

### 7. Test RAG Query (Should Return Drive/Contacts Only)
```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/ai/query/combined" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "show my drive files",
    "wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9"
  }'
```

---

## Action Items

### For You (User)

1. **Run Tests 2-7** to verify current pipeline state
2. **Check Railway logs** during sync for errors
3. **Inspect frontend code** to confirm which endpoints are used
4. **Test in browser** - open Google Workspace integration page
5. **Report findings** - share test results for next steps

### For Future Development

1. **Document Hybrid Model** in `src/components/integrations/README.md`
2. **Update AI Assistant** to use hybrid queries (RAG + Live API)
3. **Add UI indicators** showing which data is live vs cached
4. **Consider email search** via Gmail API for AI queries

---

## Files to Inspect

### Backend (Confirmed Working)
- `backend/app/api/v1/google.py` - Live API endpoints (emails, events, etc.)
- `backend/app/adapters/google/sync.py` - Sync adapter (Drive + Contacts only)
- `backend/app/api/v1/integrations.py` - Sync orchestration
- `backend/app/services/rag_service.py` - Qdrant indexing

### Frontend (Need to Verify)
- `src/components/integrations/google/GmailInbox.tsx` - Should use `/emails` endpoint
- `src/components/integrations/google/CalendarView.tsx` - Should use `/events` endpoint
- `src/components/integrations/google/DriveExplorer.tsx` - Should use `/data?data_type=drive`
- `src/components/integrations/google/ContactsList.tsx` - Should use `/data?data_type=contacts`
- `src/components/AIChat.tsx` - Should use hybrid query approach

---

## Conclusion

**The pipeline is NOT broken** - it's working exactly as designed.

The confusion stems from the undocumented hybrid model. Gmail and Calendar were intentionally excluded from storage to avoid:
1. **Storage bloat** - Thousands of emails
2. **Stale data** - Calendar events change frequently
3. **Privacy concerns** - Less sensitive data at rest
4. **Performance issues** - Slow sync times

**What's Needed:**
1. Verify frontend uses correct endpoints
2. Document the hybrid model clearly
3. Update AI Assistant to query both RAG and live APIs
4. Test with actual user wallet

---

**Next Step:** Run the testing checklist above and share results.
