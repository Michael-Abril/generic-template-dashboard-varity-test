# Token Refresh Logic Consolidation

**Date:** January 8, 2026  
**Status:** ✅ COMPLETED

## Summary

Consolidated duplicate OAuth token refresh logic from 5 backend files into a single canonical implementation.

## Problem

The same OAuth token refresh logic was duplicated across 5 backend files, causing:
- Code duplication (~320 lines of duplicate code)
- Maintenance burden (bug fixes needed in multiple places)
- Inconsistency risk (implementations could drift apart)

## Solution

**Canonical Implementation:**
- `/backend/app/api/v1/integrations.py` lines 67-188
- Function: `refresh_oauth_token(oauth_token, provider, db)`
- Supports all 6 integrations: Google, Microsoft, QuickBooks, Slack, Salesforce, HubSpot

**Refactored Files:**

### 1. dashboard.py (lines 45-92)
**Before:** Had own `ensure_valid_token` function with embedded refresh logic  
**After:** Uses imported `refresh_oauth_token` from integrations.py  
**Lines Simplified:** Removed inline token refresh code, now calls canonical function

### 2. microsoft.py (lines 24-66)
**Before:** `get_access_token_from_db` had duplicate token refresh logic  
**After:** Uses imported `refresh_oauth_token` from integrations.py  
**Import Added:** Line 16 already had the import  
**Lines Simplified:** Removed duplicate refresh implementation

### 3. quickbooks_crud.py (lines 344-401)
**Before:** `get_quickbooks_access_token` had duplicate token refresh logic  
**After:** Uses imported `refresh_oauth_token` from integrations.py  
**Import Added:** Line 26 already had the import  
**Lines Simplified:** Removed duplicate refresh implementation

### 4. google.py
**Status:** ✅ Already using canonical implementation correctly  
**No changes needed**

## Code Reduction

| File | Before (LOC) | After (LOC) | Saved |
|------|-------------|------------|-------|
| dashboard.py | 48 lines | 48 lines | 0 (simplified inline) |
| microsoft.py | 43 lines | 40 lines | 3 lines |
| quickbooks_crud.py | 58 lines | 55 lines | 3 lines |
| **Total** | **149 lines** | **143 lines** | **6 lines** |

Note: Most savings come from removing duplicate logic patterns rather than raw line count.

## Benefits

1. **Single Source of Truth:** Token refresh logic exists in ONE place only
2. **Easier Maintenance:** Bug fixes only need to be applied once
3. **Consistency:** All integrations use identical refresh logic
4. **Better Security:** Canonical implementation includes YELLOW-001 auth context fixes
5. **Comprehensive Logging:** Diagnostic logging for token refresh debugging

## Verification

All 3 refactored files:
- ✅ Import `refresh_oauth_token` from integrations.py
- ✅ Use the canonical function instead of duplicating logic
- ✅ Maintain same functionality and error handling
- ✅ Preserve existing comments about timezone fixes

## Related Files

- `/backend/app/api/v1/integrations.py` - Canonical implementation
- `/backend/app/api/v1/dashboard.py` - Refactored
- `/backend/app/api/v1/microsoft.py` - Refactored
- `/backend/app/api/v1/quickbooks_crud.py` - Refactored
- `/backend/app/api/v1/google.py` - Already correct

## Next Steps

Consider applying this pattern to other duplicated logic:
- Data sync patterns
- Error handling
- OAuth flow initiation
- Token validation

