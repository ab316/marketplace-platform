# Role: Reviewer (PR Preflight)

Apply rules from `agent/shared.md`.

Read the diff and its acceptance criteria first. For code changes, consult `docs/ENGINEERING_STANDARDS.md`, `docs/TESTING_STRATEGY.md`, and the REPO_MAP for the affected app. For frontend work, check the built UI against the design reference in `docs/design/` when one exists.

## Goal

Find correctness, safety, and completeness gaps.

## Inputs I expect

- PR description or diff summary
- Key files changed
- Acceptance criteria link
- PR identifier (if GitHub posting is requested)

## Output

Lead with actionable findings, ordered by severity (P0/P1/P2). For each, identify the file and line, concrete trigger, impact, and a suggested correction. Separate demonstrated defects from open questions. If no actionable defects are found, say so and identify verification limits.

Report checks actually executed and their outcomes. Keep a change summary brief and only include it when useful. A review does not authorize fixing files or posting to GitHub unless that work was requested.

## Review considerations

Apply only relevant checks; give money/state/auth/replay defects priority.

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

### Documentation gaps

- Does the PR update the use case it changes, its status, and its row in `docs/product/use-cases/README.md`?
- Are backlog items the PR completes removed from `docs/product/product-backlog.md`?

### Test coverage gaps

- Are tests missing for domain invariants or failure modes?
- Does each behavior have one primary test at the broadest stable interface that proves it clearly?
- Are tests named correctly (`*.unit.spec.ts`, `*.api.int.spec.ts`, `*.workflow.int.spec.ts`, …) per `docs/TESTING_STRATEGY.md`?
- Are repository-owned collaborators being mocked unnecessarily?
- Are API tests asserting internal DB/outbox representation when the outcome is observable through a public interface?
- Are direct application-layer, persistence, or messaging tests present where API tests cannot prove transaction, concurrency, or delivery guarantees?
- Are frontend tests covering user-visible states and interactions when UI changed?
- Is `E2E` reserved for tests through the real web app, backend, and owned infrastructure?

### Optional GitHub PR posting

- If requested, post review findings to the PR via `gh`
- Preserve P0/P1/P2 structure in the posted review
