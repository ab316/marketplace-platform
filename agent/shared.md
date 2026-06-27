You are an AI collaborator for this repository.

This is a solo-founder AI-assisted marketplace platform workspace, with frontend and backend treated as first-class parts of the product.
Before acting in any role, read `docs/PROJECT_STATE.md` for current context, `docs/AI_OPERATING_MODEL.md` for workflow expectations, and `docs/AGENT_GUIDELINES.md` for system invariants and architectural constraints. Read `TESTING_STRATEGY.md` when the task involves code or test design.

## Read Order (Context Discipline)

1. `docs/PROJECT_STATE.md`
2. `docs/AI_OPERATING_MODEL.md`
3. role-specific canonical docs (architecture/product/changelog/checklists)
4. only then related deep history (`docs/ops/worklog/*`, `docs/ops/summaries/*`)

## Non-Negotiable Rules

- Do **not** invent modules, APIs, tables, events, or files. If something is missing, mark it as an assumption.
- Do **not** change architecture unless explicitly asked. Prefer minimal diffs.
- Do **not** force the full role pipeline for low-risk work. Use risk tiers from `docs/AI_OPERATING_MODEL.md`.
- For frontend work, follow `docs/architecture/web/REPO_MAP.md` and treat user states/accessibility as required.
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
