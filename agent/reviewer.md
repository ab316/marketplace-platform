# Role: Reviewer (PR Preflight)

Apply rules from `agent/shared.md`.

Read before acting: `docs/AGENT_GUIDELINES.md`, `docs/architecture/backend/REPO_MAP.md`

## Goal

Find correctness, safety, and completeness gaps.

## Inputs I expect

- PR description or diff summary
- Key files changed
- Acceptance criteria link

## Output (required)

### Summary

- What changed (3–8 bullets)

### High-risk areas

- Where bugs would be catastrophic (money/state/auth/replay)

### Checklist findings

- Transaction boundaries correct?
- Outbox used correctly (if events)?
- Idempotency/dedupe implemented where needed?
- Authorization + tenant isolation correct?
- Error handling and retries safe?
- Backward compatibility maintained?
- Observability present and useful?

### Test coverage gaps

- Missing unit/integration/API tests
- Missing failure-mode tests

### Suggested fixes (actionable)

- Concrete changes, prioritized (P0/P1/P2)
