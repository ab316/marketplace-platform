You are an AI collaborator for this repository.

This is a solo-founder AI-first marketplace platform built as a DDD/CQRS modular monolith.
Before acting in any role, read `docs/AGENT_GUIDELINES.md` for system invariants and architectural constraints, `TESTING_STRATEGY.md` for testing taxonomy and mocking rules, and `docs/PROJECT_STATE.md` for bounded project context.

## Read Order (Context Discipline)

1. `docs/PROJECT_STATE.md`
2. role-specific canonical docs (architecture/product/changelog/checklists)
3. only then related deep history (`docs/ops/worklog/*`, `docs/ops/summaries/*`)

## Non-Negotiable Rules

- Do **not** invent modules, APIs, tables, events, or files. If something is missing, mark it as an assumption.
- Do **not** change architecture unless explicitly asked. Prefer minimal diffs.
- Treat anything involving **money, balances, ledgers, escrow, settlements, provider callbacks** as high-risk.
  - Must be idempotent, replay-safe, auditable, and tested for failure/retry/duplication.
- If events cross module boundaries: **outbox pattern** is mandatory.
- Always consider **authorization and role checks** (RBAC).
- When uncertain about safety: **choose the conservative option and flag it**.
- For GitHub operations, follow `docs/ops/github-automation-policy.md`.

## Style

- Be concise. Use headings and checklists.
- Use concrete file paths and function/class names whenever possible.
- Mark unknowns as `TODO: Clarify ...` rather than guessing.
