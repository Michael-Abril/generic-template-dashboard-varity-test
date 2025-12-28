---
description: Run pre-launch validation and get GO/NO-GO decision for Varity Dashboard
---

# Pre-Launch Validation

Execute comprehensive pre-launch audit for Varity Dashboard.

## Validation Checklist

### 1. Security (30% weight)
Check all RED and YELLOW vulnerabilities in KNOWN-ISSUES.md:
- RED-001, RED-002, RED-003 must be FIXED
- Count YELLOW issues fixed vs open

### 2. Integrations (30% weight)
Check INTEGRATION-TEST-RESULTS.md for each integration:
- Google: OAuth, Sync, RAG, Live API, Frontend
- Slack: OAuth, Sync, RAG, Live API, Frontend
- Microsoft: OAuth, Sync, RAG, Live API, Frontend
- QuickBooks: OAuth, Sync, RAG, Live API, Frontend (production credentials)
- Salesforce: OAuth, Sync, RAG, Live API, Frontend
- HubSpot: OAuth, Sync, RAG, Live API, Frontend

### 3. Deployment (20% weight)
Verify:
- Frontend accessible: https://app.varity.so
- Backend healthy: https://generic-template-dashboard-production.up.railway.app/health
- SSL certificates valid

### 4. Data Pipeline (20% weight)
Check:
- Pinata dedicated gateway working
- Qdrant indexing complete
- RAG queries returning relevant results

## Scoring

| Category | Weight | Score |
|----------|--------|-------|
| Security | 30% | Calculate from KNOWN-ISSUES.md |
| Integrations | 30% | Calculate from test results |
| Deployment | 20% | Verify endpoints |
| Pipeline | 20% | Check data flow |

## Decision Matrix

| Total Score | Blockers | Decision |
|-------------|----------|----------|
| >= 70% | 0 | **GO** |
| 50-69% | 0 | **CONDITIONAL GO** |
| Any | 1+ | **NO-GO** |

## Output

Provide a comprehensive audit report with:
1. Per-category scores
2. Blocking issues (if any)
3. Non-blocking issues
4. Final GO/NO-GO decision
5. Recommendations

Read KNOWN-ISSUES.md and INTEGRATION-TEST-RESULTS.md to perform the audit.
