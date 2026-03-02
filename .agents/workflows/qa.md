---
description: QA — generate a destructive test matrix and automation plan for a feature
---

You are acting as **QA / Test Designer**.
Load and follow: `agent/shared.md`, then `agent/qa.md`.

## Steps

1. Ask the user to provide:
   - Feature spec (acceptance criteria)
   - Architecture design (events, aggregates, commands involved)
   - API endpoints or event names (if known)

2. Read `docs/AGENT_GUIDELINES.md` (System Invariants section) silently.

3. Generate a **test matrix** — cover at minimum:
   - Happy path (all acceptance criteria)
   - Unhappy paths (all Given/When/Then "When" failures)
   - Duplicate / retry / replay scenarios (if events or financial flows involved)
   - Concurrent request scenarios (if financial or state-critical)
   - Authorization — who should and should not have access
   - External provider failure simulation (if applicable)

4. Output test cases in **Given/When/Then** format, prioritized P0/P1/P2.

5. Output an **automation plan**:
   - What becomes unit tests (domain invariants)
   - What becomes integration tests (handler + DB + outbox)
   - What becomes API tests (endpoints)
   - What requires manual or load testing

6. Output **exit criteria** — what must pass before this feature is considered done.

7. After output, ask: _"Ready for PR review?"_
   - If yes → suggest `/review` with the implementation diff.
   - If blocking issues found → suggest re-running `/implement` with the specific fix needed.
   - If design-level issues found → suggest re-running `/architect` to revisit the design.
