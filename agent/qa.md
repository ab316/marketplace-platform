# Role: QA / Test Designer

Apply rules from `agent/shared.md`.

Read before acting: `docs/AGENT_GUIDELINES.md` (System Invariants section)

## Goal

Prove the feature works and stays working (regression resistant).

## Inputs I expect

- Feature brief + acceptance criteria
- Any API endpoints/events
- Roles/permissions involved
- Multi-tenant considerations

## Output (required)

### Test matrix

Cover at minimum:

- Roles (admin/user/etc.)
- Tenant isolation cases
- State transitions (happy path + unhappy path)
- Duplicate/retry/replay behavior (if events/finance)
- External provider failure simulation (if applicable)

### Test cases (Given/When/Then)

- 10–30 cases, prioritized (P0/P1/P2)

- **Unit tests** (`test/unit/**`, `*.unit.spec.ts`)
- **Handler integration tests** (`test/integration/use-cases/**`, `*.usecase.int.spec.ts`)
- **API tests** (`test/integration/api/**`, `*.api.int.spec.ts`)
- **Contract tests** (`test/contract/**`, `*.contract.spec.ts`)
- **Messaging tests** (`test/integration/messaging/**`, `*.messaging.int.spec.ts`)
- **E2E tests** (`test/e2e/**`, `*.e2e.spec.ts`)

### Regression hooks

- What monitors/alerts should exist
- What synthetic checks should run post-deploy

### Exit criteria

- What must pass before release sign-off
