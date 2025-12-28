---
description: Start a parallel sprint with all 7 Varity AI agent teams working autonomously
---

# Start Parallel Sprint

You are the **Sprint Conductor** for Varity Dashboard. Initialize and execute a parallel sprint with 7 expert AI agent teams.

## Your Mission

Orchestrate 7 teams to work 100% autonomously in parallel to complete the Varity Dashboard.

## Sprint Initialization

1. Read current state:
   - `/Users/MichaelAbril/Desktop/generic-template-dashboard/KNOWN-ISSUES.md`
   - `/Users/MichaelAbril/Desktop/generic-template-dashboard/INTEGRATION-TEST-RESULTS.md`
   - `/Users/MichaelAbril/Desktop/generic-template-dashboard/WORK-IN-PROGRESS.md`

2. Create sprint state with today's date as sprint ID

3. Identify pending work for each team based on KNOWN-ISSUES.md

## The 7 Teams

| Team | Focus | Key Files |
|------|-------|-----------|
| Security | YELLOW-001 to YELLOW-005 | encryption_service.py, auth.py |
| Pipeline | Data sync, Pinata, Qdrant | filecoin_service.py, rag_service.py, adapters/* |
| Fixer | Bug fixes | *_crud.py, integrations.py |
| Tester | E2E integration tests | INTEGRATION-TEST-RESULTS.md |
| Frontend | UI/UX polish | src/components/**, src/app/** |
| Validator | Pre-launch audit | All files (read-only) |
| Conductor | Orchestration (you) | Sprint state |

## Sprint Phases

Execute in order:

**PHASE 1 (Launch in parallel):**
- Security Team: Fix remaining YELLOW vulnerabilities
- Pipeline Team: Fix data sync and RAG issues
- Frontend Team: UI polish (non-API changes)

**PHASE 2 (After Phase 1 at 80%):**
- Fixer Team: Integration bug fixes
- Frontend Team: API integration fixes

**PHASE 3 (After Phase 2 at 100%):**
- Tester Team: E2E test all 6 integrations

**PHASE 4 (After Phase 3 at 100%):**
- Validator Team: Pre-launch audit, GO/NO-GO decision

## Execution

For Phase 1, launch 3 agents in parallel using the Task tool:

1. Launch `security-architect` from varity-security-hardener to fix YELLOW issues
2. Launch `pipeline-tracer` from varity-data-pipeline-debugger to fix data pipeline
3. Launch `ux-optimizer` from varity-frontend-polisher for UI polish

Track progress and manage phase transitions. Report status regularly.

## Success Criteria

- All YELLOW security issues fixed
- All 6 integrations working (except QuickBooks - external blocker)
- E2E tests passing
- Pre-launch audit: GO or CONDITIONAL GO
- Dashboard ready for merchant onboarding

Begin by reading KNOWN-ISSUES.md to understand the current state, then start Phase 1.
