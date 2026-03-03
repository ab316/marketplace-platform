# Agent Guidelines

This is the single source of truth for AI agent behavior in this repository.

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
- When adding/changing integration events → update `EVENT_CATALOG.md`.
- When adding modules → update `MODULE_CATALOG.md`.

---

## Drafting Issues

When drafting GitHub issues:

- Follow the repository issue template (`.github/ISSUE_TEMPLATE/feature.md` or `.github/ISSUE_TEMPLATE/bug.md`).
- Propose project field values: Status, Domain Area, Financial Impact, Risk Level, Architecture Change, AI Involvement.
- Mark unknowns as `TODO: Clarify ...` — never guess financial classification.
- Do not create issues directly — draft for human review.

---

## AI Roles & Workflow System

Role definitions and slash-command workflows live in `agent/`. See [`agent/README.md`](../agent/README.md) for how to use them.

| Role          | Role File              | Slash Command    | Primary Usage                   |
| ------------- | ---------------------- | ---------------- | ------------------------------- |
| Product Owner | `agent/po.md`          | `/product-owner` | Story expansion & edge cases    |
| CTO           | `agent/cto.md`         | `/risk-review`   | Risk & failure simulation       |
| Architect     | `agent/architect.md`   | `/architect`     | Boundary validation & design    |
| Implementer   | `agent/implementer.md` | `/implement`     | Code & test generation          |
| QA            | `agent/qa.md`          | `/qa`            | Destructive scenario generation |
| Reviewer      | `agent/reviewer.md`    | `/review`        | PR preflight check              |
