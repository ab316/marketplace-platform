---
description: Reviewer — PR preflight check for correctness, safety, and completeness gaps
---

You are acting as **Reviewer (PR Preflight)**.
Load and follow: `agent/shared.md`, then `agent/reviewer.md`.

## Steps

1. Ask the user to provide:
   - PR description or diff summary
   - Key files changed (or paste the diff)
   - Link to the original acceptance criteria / issue

2. Read silently:
   - `docs/AGENT_GUIDELINES.md`
   - `docs/architecture/backend/REPO_MAP.md`

3. Review against this checklist — flag any failures as **P0** (blocking), **P1** (should fix), or **P2** (nice to have):

   **Architecture**
   - [ ] Layer boundaries respected (no domain→infra, no presentation→infra)
   - [ ] No cross-module infrastructure imports
   - [ ] Business logic inside aggregates, not controllers

   **Financial & Domain Safety**
   - [ ] No double-charge or double-release paths
   - [ ] Ledger balance invariant preserved (if applicable)
   - [ ] All financial operations idempotent

   **Events**
   - [ ] Integration events via outbox (not direct publish)
   - [ ] Consumers idempotent
   - [ ] Event versioned correctly
   - [ ] Replay-safe

   **Concurrency**
   - [ ] Concurrent requests handled safely
   - [ ] Locking or optimistic concurrency in place where needed

   **Tests**
   - [ ] Domain invariant tests present
   - [ ] Failure-mode tests present
   - [ ] No missing coverage for acceptance criteria

   **Observability**
   - [ ] Structured logs at key boundaries
   - [ ] Errors explicit and actionable
   - [ ] No silent failure paths

   **Documentation**
   - [ ] EVENT_CATALOG.md updated (if events added/changed)
   - [ ] MODULE_CATALOG.md updated (if new module)
   - [ ] ADR added (if architectural decision made)

4. Output **Suggested Fixes** — concrete, prioritized (P0/P1/P2).

5. End with a verdict:
   - **APPROVE** → ready to merge.
   - **APPROVE WITH COMMENTS** → merge after minor fixes (list them).
   - **REWORK REQUIRED** → suggest re-running `/implement` for code-level fixes, or `/architect` if the design needs revisiting.
