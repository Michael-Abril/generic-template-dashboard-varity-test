# Google Workspace Integration - End-to-End Validation Guide

**Created:** December 29, 2025
**Purpose:** Comprehensive testing of Google Workspace integration from OAuth through frontend display
**Tester:** Integration Validator Agent
**Wallet Address:** `0x738C812FB221ba32E8726fe38961570a700e87b9`

---

## Executive Summary

Based on the existing test results (INTEGRATION-TEST-RESULTS.md), Google Workspace is at **90% working** status. This guide will help you validate the remaining 10% and verify all components work correctly.

### Current Status (from Previous Tests)

| Component | Status | Evidence |
|-----------|--------|----------|
| OAuth | ✅ PASS | Connected with refresh token |
| Token Refresh | ✅ PASS | Automatic refresh implemented |
| Storage (Drive) | ✅ PASS | 5+ files in Pinata |
| RAG Indexing | ✅ PASS | Drive files indexed in Qdrant |
| Live API (Emails) | ✅ PASS | Returns real Gmail data (3 emails confirmed) |
| Live API (Calendar) | ❓ UNTESTED | Endpoint exists, needs testing |
| Live API (Drive) | ❓ UNTESTED | Endpoint exists, needs testing |
| Frontend | ✅ PASS | All tabs load correctly |

---

## Testing Matrix

Complete this matrix by running the tests below:

| Tab | OAuth | Sync | Data Retrieval | RAG/Live | Frontend Display | Overall |
|-----|:-----:|:----:|:--------------:|:--------:|:----------------:|:-------:|
| Home | ✅ | N/A | ✅ | N/A | ✅ | ✅ |
| Gmail | ✅ | N/A | ? | ✓ Live | ? | ? |
| Calendar | ✅ | N/A | ? | ✓ Live | ? | ? |
| Drive | ✅ | ? | ? | ✓ RAG | ? | ? |
| Contacts | ✅ | ? | ? | ✓ RAG | ? | ? |
| Tasks | ✅ | N/A | N/A | N/A | 🔜 Coming Soon | N/A |

---

## Stage 1: OAuth Status Verification

### Test Command

```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/oauth/status/google?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9"
```

### Expected Response

```json
{
  "connected": true,
  "provider": "google",
  "wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9",
  "created_at": "...",
  "has_refresh_token": true
}
```

### Validation Checklist

- [ ] `connected` is `true`
- [ ] `provider` is `"google"`
- [ ] `has_refresh_token` is `true`
- [ ] No errors in response

**Result:** ___________

**Notes:** ___________

---

## Stage 2: Sync Trigger (Drive & Contacts Only)

Gmail and Calendar use **live API calls** and do not require sync. Only Drive and Contacts are stored in RAG.

### Test Command

```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/sync" \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9", "types": ["drive", "contacts"]}'
```

### Expected Response

```json
{
  "success": true,
  "provider": "google",
  "wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9",
  "sync_results": {
    "drive": {
      "files_synced": 5,
      "cids": ["Qm..."],
      "indexed": true
    },
    "contacts": {
      "contacts_synced": 10,
      "cids": ["Qm..."],
      "indexed": true
    }
  }
}
```

### Validation Checklist

- [ ] `success` is `true`
- [ ] `sync_results.drive.files_synced` > 0
- [ ] `sync_results.drive.indexed` is `true`
- [ ] `sync_results.contacts.indexed` is `true`
- [ ] No errors in response

**Result:** ___________

**Notes:** ___________

---

## Stage 3: Data Retrieval Tests

### 3A. Gmail (Live API)

```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/emails?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&max_results=10"
```

**Expected:** Array of 10 emails with `id`, `subject`, `from`, `date`, `snippet`

**Validation:**
- [ ] Returns array of emails
- [ ] Each email has required fields
- [ ] `from` addresses are valid
- [ ] Dates are properly formatted

**Result:** ___________

---

### 3B. Calendar (Live API)

```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/events?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&max_results=10"
```

**Expected:** Array of calendar events with `id`, `summary`, `start`, `end`, `location`

**Validation:**
- [ ] Returns array of events (may be empty)
- [ ] If events exist, they have required fields
- [ ] Start/end times are ISO 8601 format
- [ ] No errors in response

**Result:** ___________

---

### 3C. Drive Files (RAG Storage)

```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/data?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&types=drive"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "drive": {
      "files": [
        {
          "id": "...",
          "name": "3PL Comparison",
          "mimeType": "...",
          "webViewLink": "...",
          "modifiedTime": "..."
        }
      ]
    }
  }
}
```

**Validation:**
- [ ] Returns drive files array
- [ ] Files have `id`, `name`, `mimeType`
- [ ] `webViewLink` is valid URL
- [ ] File count matches sync results

**Result:** ___________

---

### 3D. Contacts (RAG Storage)

```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/data?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9&types=contacts"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "contacts": {
      "contacts": [
        {
          "resourceName": "...",
          "names": [{"displayName": "..."}],
          "emailAddresses": [{"value": "..."}],
          "phoneNumbers": [{"value": "..."}]
        }
      ]
    }
  }
}
```

**Validation:**
- [ ] Returns contacts array
- [ ] Contacts have `names`, `emailAddresses`
- [ ] Contact count matches sync results
- [ ] No duplicate contacts

**Result:** ___________

---

## Stage 4: RAG Query Test

Test if AI can query Drive files and Contacts from Qdrant.

### Drive Files Query

```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/ai/query/combined" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9",
    "query": "What files are in my Google Drive?"
  }'
```

**Expected:**
- `context_used: true`
- `rag_sources` includes CIDs from Drive sync
- Answer mentions file names ("3PL Comparison", etc.)

**Validation:**
- [ ] `context_used` is `true`
- [ ] `rag_sources` array has Drive CIDs
- [ ] Answer accurately describes Drive files
- [ ] No errors in response

**Result:** ___________

---

### Contacts Query

```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/ai/query/combined" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9",
    "query": "Who are my contacts in Google?"
  }'
```

**Expected:**
- `context_used: true`
- `rag_sources` includes CIDs from Contacts sync
- Answer lists contact names/emails

**Validation:**
- [ ] `context_used` is `true`
- [ ] `rag_sources` array has Contacts CIDs
- [ ] Answer mentions contact names
- [ ] No errors in response

**Result:** ___________

---

## Stage 5: Frontend Display Verification

Unfortunately, I cannot access the browser directly, but here's what you should test manually:

### 5A. Navigation Test

1. Navigate to: `https://app.varity.so/dashboard/tools/google`
2. Verify the page loads without errors
3. Check browser console for errors (F12)

**Validation:**
- [ ] Page loads successfully
- [ ] Google Workspace header displays
- [ ] No console errors
- [ ] Sync button is visible

**Result:** ___________

---

### 5B. Tab Navigation Test

Click through each tab and verify:

#### Home Tab
- [ ] 4 stat cards display (Gmail, Calendar, Drive, Contacts)
- [ ] Stat cards show correct counts
- [ ] Recent Activity section shows Gmail messages
- [ ] Quick Actions section displays 4 buttons
- [ ] Clicking stat cards navigates to correct tab

**Notes:** ___________

---

#### Gmail Tab
- [ ] Email list displays
- [ ] Emails have subject, from, date
- [ ] Search bar works
- [ ] Email viewer opens when clicking email
- [ ] No console errors

**Expected Data:** At least 3 emails (from previous test)

**Notes:** ___________

---

#### Calendar Tab
- [ ] Calendar view loads
- [ ] Events display (if any exist)
- [ ] Day/Week/Month view buttons work
- [ ] Date navigation works
- [ ] No console errors

**Expected Data:** May be empty (no events in account)

**Notes:** ___________

---

#### Drive Tab
- [ ] File list displays
- [ ] Files have names, types, modified dates
- [ ] Search bar works
- [ ] File preview modal works
- [ ] No console errors

**Expected Data:** At least 5 files (from sync results)

**Notes:** ___________

---

#### Contacts Tab
- [ ] Contact list displays
- [ ] Contacts have names, emails
- [ ] Search bar works
- [ ] Contact detail view works (if implemented)
- [ ] No console errors

**Expected Data:** At least 10 contacts (from sync results)

**Notes:** ___________

---

#### Tasks Tab
- [ ] Shows "Coming Soon" message
- [ ] No errors

**Notes:** ___________

---

### 5C. Sync Button Test

1. Click "Sync Data" button in header
2. Observe behavior

**Validation:**
- [ ] Button shows "Syncing..." state
- [ ] Loading animation appears
- [ ] Data refreshes after sync
- [ ] Success message or updated counts
- [ ] No errors

**Result:** ___________

---

### 5D. Search Test

1. Enter search query in header search bar
2. Press Enter

**Validation:**
- [ ] Navigates to appropriate tab (Gmail/Calendar/Drive)
- [ ] Tab shows filtered results
- [ ] Search query is applied
- [ ] No errors

**Result:** ___________

---

## Overall Assessment

### Completion Summary

| Stage | Status | Notes |
|-------|--------|-------|
| Stage 1: OAuth | _____ | _____ |
| Stage 2: Sync | _____ | _____ |
| Stage 3A: Gmail API | _____ | _____ |
| Stage 3B: Calendar API | _____ | _____ |
| Stage 3C: Drive Data | _____ | _____ |
| Stage 3D: Contacts Data | _____ | _____ |
| Stage 4: RAG Query | _____ | _____ |
| Stage 5: Frontend | _____ | _____ |

### Overall Integration Health

**Working Percentage:** _____ %

**Pass/Fail Status:**
- PASS: All critical components working (Gmail, Drive, Frontend)
- PARTIAL: Some components working, minor issues
- FAIL: Critical components broken

**Final Verdict:** ___________

---

## Issues Found

List any issues discovered during testing:

### Critical Issues
1. ___________
2. ___________

### Minor Issues
1. ___________
2. ___________

### Recommendations
1. ___________
2. ___________

---

## Next Steps

Based on test results:

- [ ] Update INTEGRATION-TEST-RESULTS.md with findings
- [ ] Create bug tickets for any issues found
- [ ] Document missing features (if any)
- [ ] Test with different Google accounts (if available)
- [ ] Verify error handling (expired tokens, API failures)

---

## Test Environment

| Property | Value |
|----------|-------|
| Frontend URL | https://app.varity.so |
| Backend URL | https://generic-template-dashboard-production.up.railway.app |
| Wallet Address | 0x738C812FB221ba32E8726fe38961570a700e87b9 |
| Test Date | _____ |
| Tester | _____ |
| Browser | _____ |
| OS | _____ |

---

**Document Version:** 1.0
**Last Updated:** December 29, 2025
**Agent:** Integration Validator (Sonnet 4.5)
