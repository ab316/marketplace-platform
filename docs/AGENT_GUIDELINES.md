# Agent Guidelines

This is the single source of truth for AI agent safety rules in this repository.

Tool bootstrap note:

- `AGENTS.md` exists as a cross-tool bootstrap/index file.
- `docs/AI_OPERATING_MODEL.md` defines the default solo-founder AI workflow.
- If any conflict exists, this file (`docs/AGENT_GUIDELINES.md`) is authoritative.

---

## System Invariants (Non-Negotiable)

These rules override feature speed. No exceptions.

1. **No double charging** — payment operations must be idempotent.
2. **No ledger corruption** — double-entry accounting must always balance.
3. **No lost integration events** — all integration events persisted via transactional outbox.
4. **No inconsistent order states** — state transitions must be explicit.
5. **Invariants enforced inside aggregates** — domain logic never in controllers.
6. **Integration event consumers must be idempotent** — duplicate delivery must be tolerated.
7. **Event replays must not corrupt state.**
8. **No silent money creation or deletion.**
9. **Concurrency-safe** — aggregates must protect invariants under concurrent access. Prefer optimistic locking or transactional boundaries.

When uncertain about financial safety, ledger correctness, distributed event behavior, or idempotency: **choose the conservative option**.

---

## Architectural Constraints

Machine-readable rules: `docs/architecture/manifest.json`

### Layer Rules

- **Domain**: Business logic, invariants, aggregates. No IO. No framework imports.
- **Application**: Use-case orchestration. No IO. No infrastructure imports.
- **Infrastructure**: Implements ports (repos, cache, messaging). May perform IO.
- **Presentation**: HTTP routes/controllers. Calls application layer only.

### Dependency Direction

High-level direction (non-exhaustive):

```
domain       → (nothing)
application  → domain + core-contracts (+ core-domain where needed)
infrastructure → application + domain + core-contracts + core-runtime
presentation → application (+ shared/presentation helpers)
```

### Forbidden

- Domain importing infrastructure or presentation
- Application importing infrastructure or presentation
- Presentation importing infrastructure
- Module A importing Module B's infrastructure or presentation

Full structural rules → [backend/REPO_MAP.md](architecture/backend/REPO_MAP.md)

### Frontend Rules

- Frontend structural rules → [web/REPO_MAP.md](architecture/web/REPO_MAP.md)
- `apps/web` must not import from `apps/backend`.
- Backend communication must go through the web data/API layer.
- Shared request/response contracts must come from `packages/api-contracts`.
- Use Server Components by default once Next.js is initialized.
- Add Client Components only for interaction, browser APIs, optimistic UI, or local UI state.
- User-facing features must handle loading, empty, validation-error, recoverable-error, unauthorized/forbidden, and success states where applicable.
- Accessibility is required: semantic HTML, labels, keyboard access, focus states, and meaningful errors.

---

## Change Control

### Scope

- Do not redesign architecture unless explicitly asked.
- Do not introduce new patterns without justification.
- Do not refactor unrelated modules during feature work.
- Do not expand scope beyond the requested feature.
- Keep MVP scope tight — avoid feature creep.
- Default to the lightweight loop in `docs/AI_OPERATING_MODEL.md`.
- Escalate to strict role gates only for high-risk domain work or when the user asks for them.

### When Architecture Change Is Needed

1. Stop.
2. Flag it clearly with rationale.
3. Await explicit approval.
4. If approved, create an ADR: `docs/decisions/ADR-XXX-<Title>.md`

---

## Code Quality Rules

- Follow existing naming conventions (domain language).
- Respect module boundaries.
- Tests required: unit (domain/application), integration (infrastructure), API (presentation).
- Frontend tests required for meaningful UI behavior: component/integration tests for feature states and E2E tests for critical workflows once runnable.
- Domain events are internal (same transaction). Integration events go through outbox.
- Integration events MUST use versioned names/schemas (for example `OrderPlaced.v1`).
- When adding/changing integration events → update `EVENT_CATALOG.md` and producer/consumer module README `Publishes/Consumes` sections.
- When adding modules → update `MODULE_CATALOG.md`.

---

## Context Discipline

All agents should use bounded context reads:

1. Read `docs/PROJECT_STATE.md` first.
2. Read `docs/AI_OPERATING_MODEL.md` for workflow and memory expectations.
3. Read role-specific canonical docs only when they are relevant.
4. Read deep history (`docs/ops/worklog/*`, `docs/ops/summaries/*`) only when needed.

---

## GitHub Automation Policy

Policy source: `docs/ops/github-automation-policy.md`

### Allowed (guarded direct writes)

- create/update issues
- update labels/assignees/milestones/project fields
- move board stages
- post PR/issue comments and review findings
- close duplicates with canonical links
- close completed issues when merge is complete and relevant docs/project memory updates are done
- prepare release drafts

### Disallowed

- merge PRs
- delete branches
- publish tags/releases without explicit human approval
- change repository settings/security policies

### Idempotency and Audit

- Use operation key format: `<repo>:<resource_type>:<resource_id>:<action>:<target_state>`
- Log write operations in `docs/ops/audit-log.md`

---

## Issue and Backlog Operations

- Follow `.github/ISSUE_TEMPLATE/feature.md` and `.github/ISSUE_TEMPLATE/bug.md`.
- Normalize required fields before stage progression.
- Deduplicate semantically similar issues and keep one canonical issue.
- Re-triage stale backlog items and track queue aging.
- Require concise issue summary + memory pointers before implementation readiness.

---

## AI Roles & Workflow System

Role definitions and slash-command workflows live in `agent/` and `.agents/workflows/`.

Roles are reusable lenses, not a mandatory team simulation. One AI session may combine product, architecture, implementation, QA, and review work for low-risk changes. Use the full sequence for Tier 3 work as defined in `docs/AI_OPERATING_MODEL.md`.

| Role             | Role File                  | Slash Command      | Primary Usage                                    |
| ---------------- | -------------------------- | ------------------ | ------------------------------------------------ |
| Product Owner    | `agent/po.md`              | `/product-owner`   | Story expansion and acceptance criteria          |
| Scrum Master     | `agent/scrum-master.md`    | `/scrum-master`    | Intake, triage, dedupe, issue/project operations |
| CTO              | `agent/cto.md`             | `/risk-review`     | Risk and failure simulation                      |
| Architect        | `agent/architect.md`       | `/architect`       | Boundary validation and design                   |
| Implementer      | `agent/implementer.md`     | `/implement`       | Code and test generation                         |
| QA               | `agent/qa.md`              | `/qa`              | Destructive scenario generation                  |
| Reviewer         | `agent/reviewer.md`        | `/review`          | PR preflight, optional GitHub posting            |
| Technical Writer | `agent/tech-writer.md`     | `/tech-writer`     | Changelog/catalog/update synchronization         |
| Chronicler       | `agent/chronicler.md`      | `/chronicler`      | Bounded project memory maintenance               |
| Release Manager  | `agent/release-manager.md` | `/release-manager` | Release checklist, versioning rationale, drafts  |

Default delivery guidance:

- Discovery/docs: capture decisions in `docs/product/discovery.md`, `docs/product/use-cases/`, ADRs, or `docs/PROJECT_STATE.md` as appropriate.
- Low-risk code: brief plan, implement, test, review.
- High-risk domain work: use `/product-owner -> /risk-review -> /architect -> /implement -> /qa -> /review`.
