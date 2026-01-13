# AI Assistant Live API Fallback Enhancement

**Date:** January 12, 2026
**File Modified:** `backend/app/api/v1/ai.py`
**Purpose:** Enable AI Assistant to use live integration data when RAG (Qdrant) is empty

---

## Problem Statement

AI Assistant queries Qdrant for indexed data. When Qdrant is empty (no sync, expired OAuth, etc.), AI lacks business context and cannot answer integration-specific questions.

**Current Behavior:**
- RAG empty → AI returns generic "no data found" message
- User experience degrades to 0% even though live API endpoints exist and work

**Desired Behavior:**
- RAG empty → Try fetching from live API endpoints
- AI gets fresh business context even without RAG indexing
- User experience improves from 0% to 60-70% even without sync

---

## Solution Architecture

### 1. New Helper Function: `_fetch_live_data_for_ai()`

**Location:** Lines 2753-2863

**Purpose:** Fetch live data from integration endpoints as fallback context for AI.

**Supported Integrations:**
- Google: emails, calendar, files, contacts
- Microsoft: mail, calendar, files, contacts
- Slack: channels, messages
- QuickBooks: invoices, customers, expenses, payments

**Logic:**
1. Check if OAuth token exists for integration
2. Map integration + data_type to live API endpoint
3. Make internal API call to fetch data
4. Normalize response format across integrations
5. Return up to 10 items for AI context

**Example Endpoint Mapping:**
```python
"google": {
    "emails": "/api/v1/integrations/google/emails?wallet_address={wallet}&max_results=10",
    "files": "/api/v1/integrations/google/files?wallet_address={wallet}&page_size=10",
}
```

### 2. Modified Function: `_build_rag_context()`

**Location:** Lines 2866-3010

**Changes:**

#### A. Added `db` Parameter
```python
async def _build_rag_context(
    wallet_address: str,
    tools: List[str],
    query: str,
    filters: Optional[Dict[str, Any]] = None,
    db: Optional[AsyncSession] = None  # NEW
) -> Dict[str, Any]:
```

#### B. Live API Fallback Logic (Lines 2959-2994)

**When:** RAG returns no sources (`context["sources"]` is empty)

**Process:**
1. Log: "RAG empty, attempting Live API fallback"
2. Define data types per integration (LIVE_DATA_TYPES)
3. Loop through each tool + data_type
4. Call `_fetch_live_data_for_ai()` for each
5. Add successful results to context
6. Log success/failure for each attempt

**Example:**
```python
if not context["sources"] and db is not None:
    logger.info("RAG empty, attempting Live API fallback for AI context")

    LIVE_DATA_TYPES = {
        "google": ["emails", "calendar", "files", "contacts"],
        "slack": ["channels", "messages"],
        ...
    }

    for tool in tools:
        for data_type in LIVE_DATA_TYPES[tool]:
            result = await _fetch_live_data_for_ai(wallet, tool, data_type, db)
            if result:
                context["data"][f"{tool}_{data_type}"] = result["data"]
                context["sources"].append({
                    "tool": tool,
                    "data_type": data_type,
                    "source": "live_api",
                    "record_count": result["count"]
                })
```

#### C. Improved Empty Context Message (Lines 2996-3004)

**Old Message:**
```
"No indexed business data found. If you've connected integrations,
try running a sync first. Your data will be indexed automatically."
```

**New Message:**
```
I don't have access to your business data yet. To help you better:

1. Connect your integrations in the Marketplace
2. Make sure your OAuth tokens are active (not expired)
3. Click 'Sync Data' on your integration pages

I can still help with general questions and web searches!
```

**Added Field:**
```python
context["needs_sync"] = True  # Frontend can detect and show sync prompt
```

### 3. Updated Endpoint Calls

#### A. `/chat` Endpoint (Line 258)
```python
rag_context = await _build_rag_context(
    wallet_address=request.wallet_address,
    tools=installed_tools,
    query=request.message,
    db=db  # NEW
)
```

#### B. `/query` Endpoint (Line 325)
```python
# Added db parameter to function signature
async def ai_query(request: QueryRequest, db: AsyncSession = Depends(get_db)):

# Updated call
rag_context = await _build_rag_context(
    wallet_address=request.wallet_address,
    tools=request.tools,
    query=request.query,
    filters=request.filters,
    db=db  # NEW
)
```

---

## Data Flow Diagram

```
User Query → AI Assistant
                ↓
        _build_rag_context()
                ↓
        Try Qdrant (RAG)
                ↓
        ┌───────────────────┐
        │ RAG has data?     │
        └───────────────────┘
           Yes ↓       ↓ No
               ↓       ↓
               ↓   Live API Fallback
               ↓       ↓
               ↓   _fetch_live_data_for_ai()
               ↓       ↓
               ↓   GET /api/v1/integrations/{tool}/{type}
               ↓       ↓
               └───────┘
                   ↓
        Return Context to AI
                   ↓
        AI Generates Response
```

---

## Logging Enhancements

### Success Logs
```
INFO: RAG empty, attempting Live API fallback for AI context
INFO: Live API fallback: Got 10 records for google/emails
INFO: Live API fallback: Got 3 records for slack/channels
```

### Warning Logs
```
WARNING: No OAuth token found for quickbooks
WARNING: Live API call failed: 401 - Token expired
WARNING: Live API fallback failed for microsoft/mail: Connection timeout
```

---

## Expected Impact

### Before Enhancement
| Scenario | AI Context | User Experience |
|----------|------------|-----------------|
| RAG indexed | ✅ Full data | 90% - Excellent |
| RAG empty | ❌ No data | 0% - Useless |
| OAuth expired | ❌ No data | 0% - Useless |

### After Enhancement
| Scenario | AI Context | User Experience |
|----------|------------|-----------------|
| RAG indexed | ✅ Full data | 90% - Excellent |
| RAG empty + OAuth active | ✅ Live data (10 items/type) | 60-70% - Good |
| RAG empty + OAuth expired | ❌ No data | 0% - Useless (expected) |

**Key Improvement:** Users with connected integrations but no sync can still use AI Assistant.

---

## Testing Plan

### Test Case 1: RAG Empty, OAuth Active
1. Connect Google integration
2. Skip sync (don't click "Sync Data")
3. Ask AI: "Show me my recent emails"
4. **Expected:** AI returns 10 emails from live API with source: "live_api"

### Test Case 2: RAG Has Data
1. Complete Google sync
2. Ask AI: "Show me my Drive files"
3. **Expected:** AI uses RAG data (faster), NOT live API

### Test Case 3: RAG Empty, OAuth Expired
1. Connect integration with expired token
2. Ask AI: "Show me my data"
3. **Expected:** Helpful message with steps to reconnect

### Test Case 4: Multiple Integrations
1. Connect Google + Slack (no sync)
2. Ask AI: "Summarize my emails and Slack channels"
3. **Expected:** AI gets data from both integrations via live API

---

## Production Deployment Notes

### Environment Variable Required
```bash
BACKEND_URL=http://localhost:8000  # Development
BACKEND_URL=https://generic-template-dashboard-production.up.railway.app  # Production
```

**Used by:** `_fetch_live_data_for_ai()` to make internal API calls

### Railway Configuration
Add to Railway environment variables:
```
BACKEND_URL=https://generic-template-dashboard-production.up.railway.app
```

### Performance Considerations

**Live API Calls:**
- Maximum 10 items per data_type
- Timeout: 10 seconds per endpoint
- Parallel fetching: No (sequential to avoid rate limits)

**Worst Case Scenario:**
- Google integration: 4 data types × 10s = 40s max
- This only happens when RAG is empty
- Most queries will still be fast (RAG first)

**Optimization for Future:**
- Add caching layer for live API results
- Implement parallel fetching with rate limit awareness
- Consider streaming responses for large datasets

---

## Files Modified

1. **backend/app/api/v1/ai.py**
   - Added `_fetch_live_data_for_ai()` helper (110 lines)
   - Modified `_build_rag_context()` to call fallback
   - Updated docstrings
   - Added `db` parameter to 2 endpoint functions

---

## Backward Compatibility

✅ **Fully backward compatible**

- `db` parameter is optional (`db: Optional[AsyncSession] = None`)
- If `db` is None, fallback is skipped (graceful degradation)
- Existing RAG behavior unchanged
- No database schema changes
- No breaking API changes

---

## Related Documentation

- RAG Verifier Agent: `.claude/agents/plugins/varity-suite/varity-integration-tester/agents/rag-verifier.md`
- Integration Status: `INTEGRATION-TEST-RESULTS.md`
- Backend CLAUDE: `backend/CLAUDE.md`

---

## Success Criteria

✅ **Enhancement is successful if:**

1. AI Assistant works when RAG is empty but OAuth is active
2. Live API fallback logs appear in Railway logs
3. AI responses include `source: "live_api"` in context
4. No performance degradation when RAG has data
5. Helpful error message when both RAG and OAuth fail

---

## Next Steps

1. Deploy to Railway
2. Test with test wallet: `0x738C812FB221ba32E8726fe38961570a700e87b9`
3. Verify logs show fallback attempts
4. Document AI Assistant behavior in user-facing docs
5. Consider adding frontend indicator: "Using live data (not synced)"
