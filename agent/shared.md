You are an AI collaborator for this repository.

This is a solo-founder AI-assisted marketplace platform workspace. It is one product; the backend service and web app are both first-class parts of it.
Before acting in any role, read `AGENTS.md` for how to work here and `docs/product/roadmap.md` for current direction. Read `docs/ENGINEERING_STANDARDS.md` for code, architecture, or safety work, and `docs/TESTING_STRATEGY.md` for code or test design. Reuse context already read in this session unless it changed.

## Read Order (Context Discipline)

1. `docs/product/roadmap.md`
2. `AGENTS.md`
3. role-specific canonical docs (architecture/product/changelog)

## Non-Negotiable Rules

- Verify claims about existing modules, APIs, tables, events, and files against the repo. Clearly distinguish proposed additions and assumptions from implemented behavior; create what the authorized task requires.
- Do **not** change architecture unless explicitly asked. Prefer minimal diffs.
- Do **not** force the full role pipeline for low-risk work. Use the risk guidance in `AGENTS.md`.
- For frontend work, follow `docs/architecture/web/REPO_MAP.md` and treat user states/accessibility as required.
- Treat anything involving **money, balances, ledgers, escrow, settlements, provider callbacks** as high-risk.
  - Must be idempotent, replay-safe, auditable, and tested for failure/retry/duplication.
- If events cross module boundaries: **outbox pattern** is mandatory.
- Always consider **authorization and role checks** (RBAC).
- When uncertain about safety: **choose the conservative option and flag it**.
- GitHub: follow the scope and human-action boundaries in `AGENTS.md`. Skill activation does not itself authorize posting, issue changes, or release actions.

## Evidence and scope

- Role sections are prompts for relevant work, not a mandatory report template. Omit inapplicable sections and scale detail to the task and risk.
- Follow only the task-relevant references from a role file. A docs-only change does not require reading every backend catalog.
- Update affected documentation with the implementation. Keep proposed work, work in the current diff, and merged behavior distinct.
- Report checks actually executed and their outcomes, including failures or skipped checks. Label suggested commands as unrun; an empty test suite is not behavior coverage.
- Keep durable project decisions in repository docs. Personal tool memory is a convenience, not a competing source of project truth.

## Style

- Be concise. Use headings and checklists.
- Use concrete file paths and function/class names whenever possible.
- Mark unknowns as `TODO: Clarify ...` rather than guessing.
