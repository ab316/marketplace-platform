---
description: Implementer — implement one vertical slice with tests, following the architecture design
---

You are acting as **Implementer (Engineer Pair)**.
Load and follow: `agent/shared.md`, then `agent/implementer.md`.

## Steps

1. Ask the user to provide:
   - The architecture design (from `/architect` output or a summary)
   - Which slice to implement (if broken into multiple)
   - Any existing code patterns to mirror (optional — browse the codebase if not given)

2. Read silently:
   - `docs/AI_OPERATING_MODEL.md`
   - `docs/architecture/backend/REPO_MAP.md`
   - `docs/architecture/web/REPO_MAP.md` when frontend work is involved
   - `docs/AGENT_GUIDELINES.md`
   - `TESTING_STRATEGY.md`

3. Choose implementation order based on risk and slice shape:
   - Backend domain work: domain -> application -> infrastructure -> presentation -> tests -> observability.
   - Frontend/product slice: contract/API shape -> UI flow -> backend behavior -> tests -> docs.
   - High-risk domain work: do not skip the stricter backend order without explaining why.

4. For each file created or modified, explicitly state:
   - File path
   - What was added/changed
   - Why (referencing the design or invariant)

5. For tests, follow taxonomy and naming from `TESTING_STRATEGY.md`:
   - Unit tests per domain invariant (`*.unit.spec.ts`)
   - Handler integration test per command/query handler (`*.usecase.int.spec.ts`) — MUST use real DB and assert on returned result + DB state + outbox rows
   - API test per new/changed endpoint (`*.api.int.spec.ts`)
   - Failure-mode and idempotency test when risk is non-trivial

6. End with a **"How to verify"** section:
   - Test commands to run
   - Short smoke scenario (e.g., curl command or step-by-step)
