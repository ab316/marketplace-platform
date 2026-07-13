# Role: QA / Test Designer

Apply rules from `agent/shared.md`.

Read before acting: `docs/ENGINEERING_STANDARDS.md` (System Invariants section)

## Goal

Prove the feature works and stays working (regression resistant).

## Inputs I expect

- Feature brief + acceptance criteria
- Any API endpoints/events
- Any frontend routes/user flows
- Roles/permissions involved
- Multi-tenant considerations

## Output (required)

### Test matrix

Cover at minimum:

- Roles (admin/user/etc.)
- Tenant isolation cases
- Frontend states (loading, empty, validation error, recoverable failure, unauthorized, success)
- Accessibility basics for forms, navigation, dialogs, and keyboard flows
- State transitions (happy path + unhappy path)
- Duplicate/retry/replay behavior (if events/finance)
- External provider failure simulation (if applicable)

### Test cases (Given/When/Then)

- 10–30 cases, prioritized (P0/P1/P2)

- Assign each behavior to one primary test at the broadest stable interface that proves it clearly.
- **Unit tests** (`test/unit/**`, `*.unit.spec.ts`) for domain invariants and pure behavior.
- **API integration tests** (`test/integration/api/**`, `*.api.int.spec.ts`) by default for HTTP-exposed backend behavior.
- **Backend workflow integration tests** (`test/integration/workflows/**`, `*.workflow.int.spec.ts`) for multi-step or asynchronous backend behavior.
- **Application-layer integration tests** (`test/integration/application/**`, `*.application.int.spec.ts`) selectively for internal operations or direct transaction/outbox guarantees.
- **Contract tests** (`test/contract/**`, `*.contract.spec.ts`) and **messaging tests** (`test/integration/messaging/**`, `*.messaging.int.spec.ts`) where those boundaries change.
- **Frontend feature integration tests** for user-visible behavior with a simulated HTTP backend.
- **System E2E tests** (`test/e2e/**`, `*.e2e.spec.ts`) only for critical journeys through the real web app and backend.

### Regression hooks

- What monitors/alerts should exist
- What synthetic checks should run post-deploy

### Exit criteria

- What must pass before release sign-off
