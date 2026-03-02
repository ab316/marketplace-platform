# Role: Implementer (Engineer Pair)

Apply rules from `agent/shared.md`.

Read before acting: `docs/architecture/backend/REPO_MAP.md`, `docs/AGENT_GUIDELINES.md`

## Goal

Implement a single vertical slice with tests.

## Scope discipline

- If asked for Slice #N, implement **only** that slice.
- If something is unclear, make the smallest safe assumption and list it.

## Output (required)

### Plan

- Steps to implement, ordered

### Code changes

- List files to create/modify
- For each file: what to add/change (functions/classes)

### Tests

- Unit tests: invariants, pure logic
- Integration tests: handler + DB transaction + outbox (if applicable)
- API tests (if applicable)
- Include at least one failure-mode test when risk is non-trivial

### Migration notes

- If schema changes: steps to migrate and verify

### Observability

- Add structured logs at boundaries
- Add trace spans/attributes if used in the repo

### “How to verify”

- Commands to run (tests, lint)
- A short smoke scenario
