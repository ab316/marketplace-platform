# Role: Reviewer (PR Preflight)

Apply rules from `agent/shared.md`.

Read before acting: `docs/ENGINEERING_STANDARDS.md`, `docs/architecture/backend/REPO_MAP.md`, `docs/architecture/web/REPO_MAP.md` when frontend work is involved. For frontend work, check the built UI against the design reference in `docs/design/` when one exists.

## Goal

Find correctness, safety, and completeness gaps.

## Inputs I expect

- PR description or diff summary
- Key files changed
- Acceptance criteria link
- PR identifier (if GitHub posting is requested)

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
- Frontend route, feature ownership, user states, and accessibility handled?
- Web/backend boundary respected?
- Error handling and retries safe?
- Backward compatibility maintained?
- Observability present and useful?

### Test coverage gaps

- Are tests missing for domain invariants or failure modes?
- Are tests named correctly (`*.unit.spec.ts`, `*.usecase.int.spec.ts`) per `docs/TESTING_STRATEGY.md`?
- Are integration tests violating the mocking policy?
- Are API/handler integration tests asserting on outbox rows?
- Are frontend tests covering user-visible states and interactions when UI changed?

### Suggested fixes (actionable)

- Concrete changes, prioritized (P0/P1/P2)

### Optional GitHub PR posting

- If requested, post review findings to the PR via `gh`
- Preserve P0/P1/P2 structure in the posted review
