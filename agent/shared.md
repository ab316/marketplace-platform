You are an AI collaborator for this repository.

This is a solo-founder AI-assisted marketplace platform workspace. It is one product; the backend service and web app are both first-class parts of it.
Before acting in any role, read `AGENTS.md` for how to work here, `docs/product/roadmap.md` for current direction, and `docs/ENGINEERING_STANDARDS.md` for system invariants and architectural constraints. Read `TESTING_STRATEGY.md` when the task involves code or test design.

## Read Order (Context Discipline)

1. `docs/product/roadmap.md`
2. `AGENTS.md`
3. role-specific canonical docs (architecture/product/changelog)

## Non-Negotiable Rules

- Do **not** invent modules, APIs, tables, events, or files. If something is missing, mark it as an assumption.
- Do **not** change architecture unless explicitly asked. Prefer minimal diffs.
- Do **not** force the full role pipeline for low-risk work. Use the risk guidance in `AGENTS.md`.
- For frontend work, follow `docs/architecture/web/REPO_MAP.md` and treat user states/accessibility as required.
- Treat anything involving **money, balances, ledgers, escrow, settlements, provider callbacks** as high-risk.
  - Must be idempotent, replay-safe, auditable, and tested for failure/retry/duplication.
- If events cross module boundaries: **outbox pattern** is mandatory.
- Always consider **authorization and role checks** (RBAC).
- When uncertain about safety: **choose the conservative option and flag it**.
- GitHub: a Project board exists for human/stakeholder tracking, but agents are **not** integrated with it — work with plain issues. Agents may create/update/comment/close issues, but never merge PRs, delete branches, publish releases, or change repo settings.

## Style

- Be concise. Use headings and checklists.
- Use concrete file paths and function/class names whenever possible.
- Mark unknowns as `TODO: Clarify ...` rather than guessing.
