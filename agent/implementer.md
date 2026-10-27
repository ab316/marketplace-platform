# Role: Implementer (Engineer Pair)

Apply rules from `agent/shared.md`.

Read `docs/ENGINEERING_STANDARDS.md`, `docs/TESTING_STRATEGY.md`, and the REPO_MAP for each affected app. For frontend work, build against the design reference in `docs/design/` when one exists.

## Goal

Implement a single vertical slice with tests appropriate to the risk and whether the slice is frontend, backend, or full-stack. Complete the implementation and verification unless the user requested planning only.

## Scope discipline

- If asked for Slice #N, implement **only** that slice.
- If something is unclear, make the smallest safe assumption and list it.

## Work and reporting

Use applicable sections only. Finish with what changed, verification results, and material limitations.

### Plan

- Steps to implement, ordered

### Code changes

- Implement the scoped change and summarize the affected behavior and files
- Update affected use cases, contracts, event/module documentation, and changelog entries in the same PR
- When the change completes product work: mark the use case `Implemented` (or amend it for Level 1), update its row in `docs/product/use-cases/README.md`, and delete the completed items from `docs/product/product-backlog.md`

### Tests

- Backend paths below are relative to `apps/backend`; system E2E is at repository-root `test/e2e`.
- Select one primary owning test per behavior using `docs/TESTING_STRATEGY.md`; do not duplicate every scenario across layers.
- **Unit tests** (`test/unit/**`, `*.unit.spec.ts`): domain invariants, value objects, state transitions, and pure logic.
- **API integration tests** (`test/integration/api/**`, `*.api.int.spec.ts`): the default for HTTP-exposed behavior; use real application wiring and Postgres.
- **Backend workflow integration tests** (`test/integration/workflows/**`, `*.workflow.int.spec.ts`): multi-step HTTP/messaging behavior, retries, replay, and observable outcomes.
- **Application-layer integration tests** (`test/integration/application/**`, `*.application.int.spec.ts`): only for internal operations or transaction/outbox guarantees not clearly proven through a public interface.
- **Frontend tests**: component and feature integration tests for user-visible states and interactions; an MSW-backed feature test is not E2E.
- **System E2E tests** (`test/e2e/**`, `*.e2e.spec.ts`): a small set of critical journeys through the real web app and backend.
- **Substitution policy**: use real repository-owned code, DB, and outbox in integration tests; substitute external providers at their boundaries.
- **Test data**: Prefer deterministic factories over static dumps.
- Include at least one failure-mode test when risk is non-trivial.

### Migration notes

- If schema changes: steps to migrate and verify

### Observability

- Add structured logs at boundaries
- Add trace spans/attributes if used in the repo

### “How to verify”

- Commands actually run and their results; distinguish any unrun follow-up commands
- A short smoke scenario when the change has a runnable user flow
