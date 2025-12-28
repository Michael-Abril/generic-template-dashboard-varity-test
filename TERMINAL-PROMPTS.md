# 5 TERMINAL META PROMPTS - Varity Dashboard Completion
**Updated:** December 27, 2025 (Agent-Verified)
**Goal:** 100% launch-ready dashboard within 48 hours
**Overall Completion:** 72% (VERIFIED by AI Agent Teams)

---

## HOW TO USE
1. Open 5 separate Claude Code terminal sessions
2. Copy the corresponding prompt into each terminal
3. Let them run autonomously - they will complete their tasks
4. Each terminal will update WORK-IN-PROGRESS.md and COMPLETED-WORK.md

---

## VERIFIED STATUS (December 27, 2025)

### What's FIXED (Agent-Verified)
- [x] RED-001: Key derivation (uses server_secret) - `encryption_service.py:209-255`
- [x] RED-002: OAuth state (uses env var) - `oauth.py:60-62`
- [x] RED-003: Key removed from response - `encryption_service.py:428-441`
- [x] BUG-003: Microsoft scopes (has ReadWrite) - `oauth.py:202`
- [x] BUG-004: Microsoft in TOKEN_REFRESH_CONFIGS - `integrations.py:44-48`
- [x] AIChat drag-drop upload (fully working) - `AIChat.tsx:2086-2108`

### What's NOT FIXED (Must Fix)
- [ ] BUG-001: Google uses `token.encrypted_token` - `google.py:103`
- [ ] BUG-002: Slack missing `groups:read,groups:history` - `oauth.py:218`
- [ ] BUG-005: Salesforce missing `department` field - `salesforce_crud.py:85-101`
- [ ] TypeScript build fails - `page.tsx:534` (undefined `toast`)
- [ ] A11Y-001: Viewport zoom disabled - `layout.tsx:32`

---

## AVAILABLE AGENT PLUGINS (67 Total)
Location: `.claude/agents/plugins/`

Key plugins for this project:
- `accessibility-compliance` - A11Y fixes
- `backend-development` - Python/FastAPI
- `javascript-typescript` - Frontend
- `debugging-toolkit` - Bug fixes
- `comprehensive-review` - Code review
- `llm-application-dev` - AI features
- `security-scanning` - Security audit
- `api-testing-observability` - API testing
- `frontend-mobile-development` - React patterns
- `error-diagnostics` - Error tracing
- `context-management` - Context optimization

---

# ═══════════════════════════════════════════════════════════════════
# TERMINAL 1: BUG FIX TEAM (High Priority Bugs)
# ═══════════════════════════════════════════════════════════════════

```
You are a BUG FIX ENGINEERING TEAM using the debugging-toolkit and backend-development agent plugins.

## YOUR MISSION
Fix the 3 remaining bugs blocking production launch.

## FIRST ACTIONS
1. Read CLAUDE.md completely
2. Read backend/CLAUDE.md
3. Read KNOWN-ISSUES.md (see BUG-001 through BUG-005)

## BUGS TO FIX (VERIFIED STATUS)

### BUG-001: Google Token Bug (CRITICAL) - NOT FIXED
**File:** `backend/app/api/v1/google.py:103`
**Current Code:**
```python
decrypted_token = await encryption_service.decrypt_oauth_token(
    encrypted_token=token.encrypted_token,  # <-- BROKEN: attribute doesn't exist
    customer_wallet=wallet_address
)
```
**Fix:** Change `token.encrypted_token` to `token.access_token`
**Test:** After fix, Google send email should work

### BUG-002: Slack Missing Private Channel Scopes (HIGH) - NOT FIXED
**File:** `backend/app/api/v1/oauth.py:218`
**Current Code:**
```python
"scope": "channels:read,channels:history,users:read,files:read,chat:write"
```
**Fix:** Add `groups:read,groups:history` to scope string:
```python
"scope": "channels:read,channels:history,groups:read,groups:history,users:read,files:read,chat:write"
```

### BUG-003: Microsoft Read-Only OAuth Scopes - ALREADY FIXED
**Verified:** Has ReadWrite scopes at `oauth.py:202`
**No action needed**

### BUG-004: Microsoft Token Refresh Config - ALREADY FIXED
**Verified:** Microsoft IS in TOKEN_REFRESH_CONFIGS at `integrations.py:44-48`
**No action needed**

### BUG-005: Salesforce Missing Department Field (LOW) - NOT FIXED
**File:** `backend/app/api/v1/salesforce_crud.py:85-101`
**Issue:** Field used at line 591 but not defined in ContactCreate model
**Fix:** Add `department: Optional[str] = None` to ContactCreate class

## AGENT PLUGINS TO USE
- debugging-toolkit: For understanding bug root causes
- backend-development: For Python/FastAPI best practices
- error-diagnostics: For tracing error paths
- api-testing-observability: For verifying fixes

## DEFINITION OF DONE
- All 3 remaining bugs fixed (BUG-001, BUG-002, BUG-005)
- No new errors introduced
- Each fix tested
- COMPLETED-WORK.md updated
- KNOWN-ISSUES.md updated (mark bugs as resolved)

## FILES YOU OWN
- backend/app/api/v1/google.py
- backend/app/api/v1/oauth.py (Slack scopes at line 218)
- backend/app/api/v1/salesforce_crud.py

## START NOW
Begin with BUG-001 (Google Token) - it's the most critical.
```

---

# ═══════════════════════════════════════════════════════════════════
# TERMINAL 2: ACCESSIBILITY & UX TEAM
# ═══════════════════════════════════════════════════════════════════

```
You are an ACCESSIBILITY & UX ENGINEERING TEAM using the accessibility-compliance and frontend-mobile-development agent plugins.

## YOUR MISSION
Fix all accessibility issues. The dashboard must be WCAG 2.1 AA compliant for launch.

## FIRST ACTIONS
1. Read CLAUDE.md completely
2. Read src/CLAUDE.md
3. Read ACCESSIBILITY-AUDIT-REPORT.md
4. Read KNOWN-ISSUES.md (see A11Y section)

## ACCESSIBILITY ISSUES TO FIX

### A11Y-001: Viewport Zoom Disabled (CRITICAL) - NOT FIXED
**File:** `src/app/layout.tsx:32`
**Current Code:**
```typescript
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,  // <-- MUST CHANGE TO true
  themeColor: '#3b82f6',
};
```
**Fix:** Change `userScalable: false` to `userScalable: true` and `maximumScale: 5`
**Time:** 5 minutes - DO THIS FIRST

### A11Y-002: Missing Skip-to-Main-Content Link
**File:** `src/components/Layout.tsx` or `src/app/layout.tsx`
**Issue:** Keyboard users must tab through entire sidebar
**Fix:** Add visually-hidden skip link at top of page
**Time:** 30 minutes

### A11Y-003: Form Inputs Missing Label Associations
**Files:**
- `src/components/onboarding/steps/CompanyProfileStep.tsx`
- `src/app/settings/page.tsx`
- `src/components/AIChat.tsx`
**Issue:** Inputs have labels but no htmlFor/id associations
**Fix:** Add htmlFor to labels, id to inputs
**Time:** 2 hours

### A11Y-004: Modal Dialogs Missing Focus Trapping
**File:** `src/components/ui/dialog.tsx`
**Issue:** Users can tab out of modals
**Fix:** Implement focus trap
**Time:** 2 hours

### A11Y-005: Contrast Issues
**Files:** Throughout - `text-gray-400` usages
**Fix:** Replace with `text-gray-500` or darker
**Time:** 1 hour

## UX QUICK WINS (If Time Permits)

### UX-002: "Context" Label is Developer Terminology
**File:** `src/components/ai/ContextPicker.tsx`
**Fix:** Rename "Context" to "Search in:" or "Ask about:"

### UX-003: Technical Syncing Labels
**File:** `src/components/onboarding/steps/SyncingStep.tsx`
**Fix:** Change "Encrypting with your key" to "Securing your data"

## AGENT PLUGINS TO USE
- accessibility-compliance: WCAG 2.1 AA standards
- frontend-mobile-development: React/TypeScript patterns
- comprehensive-review: Code quality review
- javascript-typescript: Modern JS patterns

## DEFINITION OF DONE
- All 5 A11Y issues fixed
- `npm run build` passes
- COMPLETED-WORK.md updated
- KNOWN-ISSUES.md updated (mark A11Y issues as resolved)

## FILES YOU OWN
- src/app/layout.tsx (viewport meta)
- src/components/Layout.tsx (skip link)
- src/components/ui/dialog.tsx (focus trap)
- All form components (label associations)
- src/components/ai/ContextPicker.tsx (UX rename)

## START NOW
Begin with A11Y-001 (viewport zoom) - 5-minute fix with critical legal implications.
```

---

# ═══════════════════════════════════════════════════════════════════
# TERMINAL 3: FRONTEND BUILD & POLISH TEAM
# ═══════════════════════════════════════════════════════════════════

```
You are a FRONTEND BUILD & POLISH TEAM using the javascript-typescript and frontend-mobile-development agent plugins.

## YOUR MISSION
Get `npm run build` to pass with ZERO errors. Currently it fails.

## FIRST ACTIONS
1. Read CLAUDE.md completely
2. Read src/CLAUDE.md
3. Run: `npm run build` to see current errors

## VERIFIED TYPESCRIPT ERROR
**File:** `src/app/dashboard/tools/[integration]/page.tsx:534`
**Error:** `Cannot find name 'toast'`
**Code at lines 533-534:**
```typescript
const handleQuickAction = (actionName: string) => {
    toast.info(`${actionName} - Coming soon!...`);  // <-- toast is undefined
};
```

**Fix Options:**
1. Import toast: `import { toast } from 'react-toastify'`
2. Or use existing Toast component/hook in codebase
3. Or check what toast library is in package.json

## TASKS

### Task 1: Fix ALL TypeScript Errors
- Run `npm run build`
- Fix every error (use proper types, NOT 'any')
- Run build again after each batch of fixes

### Task 2: Verify All Pages Load
Test each page loads without console errors:

| Page | URL |
|------|-----|
| Homepage | `/` |
| Onboarding | `/onboarding` |
| Dashboard | `/dashboard` |
| AI Assistant | `/ai-assistant` |
| Marketplace | `/marketplace` |
| Settings | `/settings` |
| Analytics | `/analytics` |
| Google Tools | `/dashboard/tools/google` |
| Slack Tools | `/dashboard/tools/slack` |
| Microsoft Tools | `/dashboard/tools/microsoft` |
| QuickBooks Tools | `/dashboard/tools/quickbooks` |
| Salesforce Tools | `/dashboard/tools/salesforce` |
| HubSpot Tools | `/dashboard/tools/hubspot` |

### Task 3: Remove Remaining Console.log Statements
```bash
grep -r "console.log" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
```
Keep only console.error for actual errors.

### Task 4: Add Error Boundaries
Wrap integration pages with ErrorBoundary component.

## AGENT PLUGINS TO USE
- javascript-typescript: TypeScript best practices
- frontend-mobile-development: React patterns
- error-diagnostics: Error handling
- comprehensive-review: Code quality

## DEFINITION OF DONE
- `npm run build` passes with ZERO errors
- All pages load correctly
- Console.log cleaned up
- COMPLETED-WORK.md updated
- WORK-IN-PROGRESS.md Terminal 3 marked complete

## FILES YOU OWN
- All files in src/ (except those owned by Terminal 2 and 4)
- package.json (dependencies only if needed)

## START NOW
Run `npm run build` immediately.
```

---

# ═══════════════════════════════════════════════════════════════════
# TERMINAL 4: AI ENHANCEMENT TEAM
# ═══════════════════════════════════════════════════════════════════

```
You are an AI ENHANCEMENT TEAM using the llm-application-dev and context-management agent plugins.

## YOUR MISSION
Make the Varity AI Assistant BEST-IN-CLASS for business users.

## FIRST ACTIONS
1. Read CLAUDE.md completely
2. Read src/CLAUDE.md
3. Read `src/components/AIChat.tsx` thoroughly (main file)
4. Understand current implementation before enhancing

## CURRENT STATE
AI Assistant is functional but:
- Has 4 modes (confusing for non-tech users)
- "Context" terminology is developer-speak
- RAG search works but could be smarter
- Document upload drag-drop works (verified at lines 2086-2108)

## ENHANCEMENTS TO IMPLEMENT (Pick at least 3)

### Enhancement 1: Smart Mode Selection
**File:** `src/components/AIChat.tsx`
**Goal:** AI auto-detects query intent and uses appropriate mode
- Simple questions -> Standard mode (fast)
- "Analyze", "Research", "Report" -> Deep modes
- File attached -> Document mode
- Show user which mode was auto-selected

### Enhancement 2: Better Context Preview
**Files:** `src/components/ai/ContextPicker.tsx`, `AIChat.tsx`
**Goal:** Show preview of what data will be searched
- Show count of documents per integration
- Show last sync time
- Highlight if data is stale (>24h old)

### Enhancement 3: Source Highlighting in Responses
**File:** `AIChat.tsx`
**Goal:** Inline clickable source citations [1], [2], [3]
- Add citation markers in response text
- Click to expand source details
- Show confidence score per source

### Enhancement 4: Quick Actions from AI Responses
**File:** `AIChat.tsx`
**Goal:** AI suggests actionable buttons in response
- If AI mentions email -> "Send Email" button
- If AI mentions meeting -> "Create Event" button
- If AI mentions file -> "Open File" button

### Enhancement 5: Conversation Memory Improvements
**Files:** `AIChat.tsx`, backend conversation endpoints
**Goal:** Smart context summarization
- After 10+ messages, summarize context automatically
- Show "Context window: 85%" indicator
- Allow "Clear context" without losing history

## AGENT PLUGINS TO USE
- llm-application-dev: LLM application patterns
- context-management: Context window optimization
- frontend-mobile-development: React patterns
- comprehensive-review: Code quality

## DEFINITION OF DONE
- At least 3 of 5 enhancements implemented
- `npm run build` passes
- AI Assistant tested with real queries
- COMPLETED-WORK.md updated

## FILES YOU OWN
- src/components/AIChat.tsx
- src/components/ai/* (all AI-related components)
- Backend AI endpoints if needed

## START NOW
Read AIChat.tsx thoroughly first. Understand before enhancing.
```

---

# ═══════════════════════════════════════════════════════════════════
# TERMINAL 5: INTEGRATION COMPLETION TEAM
# ═══════════════════════════════════════════════════════════════════

```
You are an INTEGRATION COMPLETION TEAM using the api-testing-observability and backend-development agent plugins.

## YOUR MISSION
Get 4+ of 6 integrations to 90%+ WORKING status.

## FIRST ACTIONS
1. Read CLAUDE.md completely
2. Read backend/CLAUDE.md
3. Read INTEGRATION-TEST-RESULTS.md
4. Read KNOWN-ISSUES.md

## CURRENT INTEGRATION STATUS (VERIFIED)

| Integration | Current | Target | Priority |
|-------------|---------|--------|----------|
| Slack | 75% | 95% | HIGH |
| Google | 70% | 95% | HIGH (after BUG-001 fix) |
| HubSpot | 50% | 90% | MEDIUM |
| Salesforce | 50% | 90% | MEDIUM |
| Microsoft | 30% | 60% | LOW |
| QuickBooks | 25% | 25% | BLOCKED (Intuit approval) |

## TASKS BY INTEGRATION

### Slack (75% -> 95%)
**What Works:** OAuth, sync (files), live API, frontend
**Missing:** Private channels (BUG-002)
**Tasks:**
1. Wait for Terminal 1 to fix BUG-002
2. Test private channel access
3. Add file download/preview
4. Test end-to-end flow

### Google (70% -> 95%)
**What Works:** OAuth, sync adapter, frontend
**Broken:** ALL CRUD operations (BUG-001)
**Tasks:**
1. Wait for Terminal 1 to fix BUG-001
2. Test send email via AI Assistant
3. Test create calendar event
4. Test upload file to Drive

### HubSpot (50% -> 90%)
**What Works:** Code complete (100%), hub_id fixed
**Unknown:** Never tested with real account
**Tasks:**
1. Test OAuth flow
2. Test sync - contacts, deals, companies
3. Test CRUD operations
4. Test end-to-end flow

### Salesforce (50% -> 90%)
**What Works:** Code complete (95%)
**Exists:** BUG-005 (department field)
**Tasks:**
1. Wait for Terminal 1 to fix BUG-005
2. Test OAuth flow
3. Test sync - leads, contacts, opportunities
4. Test end-to-end flow

### Microsoft (30% -> 60%)
**Status:** BUG-003 and BUG-004 already fixed
**Tasks:**
1. Test OAuth flow
2. Test basic read operations
3. Document remaining issues

## AGENT PLUGINS TO USE
- api-testing-observability: API testing
- backend-development: Python/FastAPI
- debugging-toolkit: Issue diagnosis
- error-diagnostics: Error tracing

## DEFINITION OF DONE
- 4+ integrations at 90%+ status
- Each integration tested end-to-end
- INTEGRATION-TEST-RESULTS.md updated
- KNOWN-ISSUES.md updated
- COMPLETED-WORK.md updated

## FILES YOU CAN MODIFY
- Backend adapter files (fixes only)
- Frontend integration pages (fixes only)
- Documentation files

## COORDINATION
- Wait for Terminal 1 to fix bugs before testing affected integrations
- Coordinate with Terminal 3 if frontend fixes needed

## START NOW
Begin with Slack (already 75%) while waiting for BUG-001 fix.
```

---

# ═══════════════════════════════════════════════════════════════════
# COORDINATION & FILE OWNERSHIP
# ═══════════════════════════════════════════════════════════════════

## File Ownership (Prevents Conflicts)

| Terminal | Owned Files |
|----------|-------------|
| Terminal 1 | google.py, oauth.py:218, salesforce_crud.py |
| Terminal 2 | layout.tsx, Layout.tsx, dialog.tsx, form components, ContextPicker.tsx |
| Terminal 3 | All other src/ files, package.json |
| Terminal 4 | AIChat.tsx, ai/* components |
| Terminal 5 | Backend adapters (fixes only), integration pages (fixes only) |

## Shared Files (Update with Section Markers)
- COMPLETED-WORK.md
- KNOWN-ISSUES.md
- WORK-IN-PROGRESS.md

## Dependency Order
```
Terminal 1 (Bugs) --> Terminal 5 (Integration Testing)
                  \
                   \
Terminal 2 (A11Y) --> Terminal 3 (Build Verification)
                  /
                 /
Terminal 4 (AI) --/
```

## Success Criteria (48-Hour Launch)
1. `npm run build` passes with zero errors
2. All 3 remaining bugs fixed (BUG-001, BUG-002, BUG-005)
3. All 5 A11Y issues fixed
4. 4+ integrations at 90%+ status
5. AI Assistant enhanced with 3+ features
6. LAUNCH-CHECKLIST.md shows "GO" status
