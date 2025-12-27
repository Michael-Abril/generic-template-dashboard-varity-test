# Deduplication Manifest - Varity Dashboard
**Generated:** December 26, 2025
**Purpose:** Track and execute codebase cleanup to reduce AI context confusion

---

## SUMMARY

| Category | Count | Lines Removed | Status |
|----------|-------|---------------|--------|
| Frontend Duplicates | 13 files | ~3,000+ | Pending |
| Backend Dead Adapters | 5 directories | ~200 | Pending |
| Backend Unused Services | 5 files | ~3,000 | Pending |
| Backend Redundant APIs | 1 file | ~300 | Pending |
| CLAUDE.md Conflicts | 1 file | ~200 | Pending |
| **TOTAL** | 25+ items | ~6,700+ lines | Pending |

---

## PHASE 1: FRONTEND DUPLICATES (DELETE)

### 1.1 QuickBooks `_full/` Directory (Delete Entire Directory)
**Location:** `src/components/integrations/quickbooks/_full/`

| File | Lines | Reason |
|------|-------|--------|
| `CustomerForm.tsx` | 386 | Identical to parent directory |
| `ExpenseForm.tsx` | 380 | Identical to parent directory |
| `InvoiceForm.tsx` | 404 | Identical to parent directory |
| `ReportViewer.tsx` | 285 | Identical to parent directory |
| `VendorsList.tsx` | 189 | Identical to parent directory |
| `CustomersList.tsx` | 274 | Near-identical to parent |
| `QuickBooksPageFull.tsx` | 449 | Dead code - not imported |
| `QuickBooksDashboardFull.tsx` | 389 | Dead code - not imported |
| `InvoicesListFull.tsx` | 444 | Dead code - not imported |
| `ExpensesListFull.tsx` | 209 | Dead code - not imported |

**Action:** `rm -rf src/components/integrations/quickbooks/_full/`

### 1.2 Duplicate Analytics File
**Location:** `src/lib/analytics 2.ts`

| File | Lines | Reason |
|------|-------|--------|
| `analytics 2.ts` | 256 | Space in filename = accidental creation |

**Keep:** `analytics.ts` (126 lines - canonical version)
**Action:** `rm "src/lib/analytics 2.ts"`

### 1.3 Duplicate HubSpot Index
**Location:** `src/components/integrations/hubspot/`

| File | Lines | Reason |
|------|-------|--------|
| `index.tsx` | 8 | Redundant - index.ts exists |

**Keep:** `index.ts` (TypeScript convention)
**Action:** `rm src/components/integrations/hubspot/index.tsx`

---

## PHASE 2: BACKEND STUB ADAPTERS (DELETE)

These adapters have ONLY `__init__.py` with no `sync.py` implementation:

| Directory | Reason |
|-----------|--------|
| `backend/app/adapters/canva/` | No sync.py, not imported |
| `backend/app/adapters/paypal/` | No sync.py, not imported |
| `backend/app/adapters/square/` | No sync.py, not imported |
| `backend/app/adapters/calendly/` | No sync.py, not imported |
| `backend/app/adapters/gusto/` | No sync.py, not imported |

**Action:**
```bash
rm -rf backend/app/adapters/canva/
rm -rf backend/app/adapters/paypal/
rm -rf backend/app/adapters/square/
rm -rf backend/app/adapters/calendly/
rm -rf backend/app/adapters/gusto/
```

---

## PHASE 3: BACKEND UNUSED SERVICES (DELETE)

| File | Lines | Reason |
|------|-------|--------|
| `backend/app/services/lead_scoring_service.py` | 545 | Not imported anywhere |
| `backend/app/services/financial_analytics_service.py` | 518 | Not imported anywhere |
| `backend/app/services/transaction_tracking_service.py` | 338 | Not imported anywhere |
| `backend/app/services/productivity_analytics.py` | 613 | Explicitly disabled for MVP |
| `backend/app/services/cross_tool_notifications.py` | 1022 | Not imported anywhere |

**Total:** ~3,036 lines of dead code

**Action:**
```bash
rm backend/app/services/lead_scoring_service.py
rm backend/app/services/financial_analytics_service.py
rm backend/app/services/transaction_tracking_service.py
rm backend/app/services/productivity_analytics.py
rm backend/app/services/cross_tool_notifications.py
```

---

## PHASE 4: BACKEND REDUNDANT API (DELETE)

| File | Lines | Reason | Keep Instead |
|------|-------|--------|--------------|
| `backend/app/api/v1/marketplace_purchases.py` | ~300 | Older version | `marketplace_v2.py` |

**Action:** `rm backend/app/api/v1/marketplace_purchases.py`

---

## PHASE 5: POTENTIALLY REDUNDANT (REVIEW LATER)

These require verification before deletion:

| File | Lines | Notes |
|------|-------|-------|
| `backend/app/services/ai_query_service.py` | ? | May duplicate together_service.py |
| `backend/app/api/v1/hubspot_crud.py` | 336 | May be needed by frontend |
| `backend/app/api/v1/quickbooks_crud.py` | 627 | May be needed by frontend |
| `backend/app/api/v1/salesforce_crud.py` | 738 | May be needed by frontend |
| `backend/verify_adapters.py` | ? | Utility script - outdated |

**Action:** Review after main cleanup, verify frontend imports

---

## PHASE 6: CLAUDE.md CONSOLIDATION

### Issues Found:
1. `src/CLAUDE.md` is outdated (Dec 23 vs Dec 26)
2. Pinata/Slack fixes duplicated in root and backend
3. Conflicting integration status terminology
4. No security audit visibility in project files

### Consolidation Plan:
1. Update `src/CLAUDE.md` to Dec 26 with all recent fixes
2. Keep root `CLAUDE.md` as master overview
3. Keep `backend/CLAUDE.md` for backend specifics
4. Remove duplicate content from backend (reference root instead)

---

## EXECUTION CHECKLIST

- [ ] Delete `src/components/integrations/quickbooks/_full/` directory
- [ ] Delete `src/lib/analytics 2.ts`
- [ ] Delete `src/components/integrations/hubspot/index.tsx`
- [ ] Delete 5 stub adapter directories
- [ ] Delete 5 unused service files
- [ ] Delete `marketplace_purchases.py`
- [ ] Update `src/CLAUDE.md` to Dec 26
- [ ] Run `npm run build` to verify frontend
- [ ] Run backend tests to verify

---

## POST-CLEANUP VERIFICATION

```bash
# Frontend
cd /Users/MichaelAbril/Desktop/generic-template-dashboard
npm run build

# Backend (if tests exist)
cd backend
python -m pytest

# Git status to review changes
git status
```

---

## EXPECTED OUTCOME

After cleanup:
- **~6,700 fewer lines** of confusing/dead code
- **~25 fewer files** wasting context
- **No duplicate implementations** to confuse AI agents
- **Single version** of each component
- **Cleaner imports** with no dead references
