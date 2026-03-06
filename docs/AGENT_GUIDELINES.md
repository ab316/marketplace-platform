# Agent Guidelines

This is the single source of truth for AI agent behavior in this repository.

Tool bootstrap note:

- `AGENTS.md` exists as a cross-tool bootstrap/index file.
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

```
domain       → (nothing)
application  → domain + core-contracts
infrastructure → application + domain + core-contracts + core-runtime
presentation → application only
```

### Forbidden

- Domain importing infrastructure or presentation
- Application importing infrastructure or presentation
- Presentation importing infrastructure
- Module A importing Module B's infrastructure or presentation

Full structural rules → [backend/REPO_MAP.md](architecture/backend/REPO_MAP.md)

---

## Change Control

### Scope

- Do not redesign architecture unless explicitly asked.
- Do not introduce new patterns without justification.
- Do not refactor unrelated modules during feature work.
- Do not expand scope beyond the requested feature.
- Keep MVP scope tight — avoid feature creep.

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
- Domain events are internal (same transaction). Integration events go through outbox.
- Integration events MUST use versioned names/schemas (for example `OrderPlaced.v1`).
- When adding/changing integration events → update `EVENT_CATALOG.md` and producer/consumer module README `Publishes/Consumes` sections.
- When adding modules → update `MODULE_CATALOG.md`.

---

## Context Discipline

All agents should use bounded context reads:

1. Read `docs/PROJECT_STATE.md` first.
2. Read role-specific canonical docs.
3. Read deep history (`docs/ops/worklog/*`, `docs/ops/summaries/*`) only when needed.

---

## GitHub Automation Policy

Policy source: `docs/ops/github-automation-policy.md`

### Allowed (guarded direct writes)

- create/update issues
- update labels/assignees/milestones/project fields
- move board stages
- post PR/issue comments and review findings
- close duplicates with canonical links
- close completed issues when merge + post-merge docs gates are done
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
