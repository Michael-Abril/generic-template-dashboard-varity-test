---
description: Get current sprint status across all 7 Varity AI agent teams
---

# Sprint Status Check

Check the current status of the parallel sprint.

## Instructions

1. Read the sprint state from:
   - `/Users/MichaelAbril/Desktop/generic-template-dashboard/.claude/agents/plugins/varity-suite/varity-parallel-sprint/state/sprint-state.json`

2. Read recent progress from:
   - `/Users/MichaelAbril/Desktop/generic-template-dashboard/KNOWN-ISSUES.md`
   - `/Users/MichaelAbril/Desktop/generic-template-dashboard/INTEGRATION-TEST-RESULTS.md`

3. Report status in this format:

```markdown
## Sprint Status: sprint-YYYY-MM-DD

**Phase:** X/4
**Overall Progress:** XX%

### Team Status

| Team | Status | Progress | Current Work |
|------|--------|----------|--------------|
| Security | Active/Done | XX% | [task] |
| Pipeline | Active/Done | XX% | [task] |
| Frontend | Active/Done | XX% | [task] |
| Fixer | Pending/Active/Done | XX% | [task] |
| Tester | Pending/Active/Done | XX% | [task] |
| Validator | Pending/Active/Done | XX% | [task] |

### Blockers
[List any blockers]

### Recent Completions
[List recent fixes]

### Next Steps
[What happens next]
```

Provide an accurate assessment of where we are in the sprint.
