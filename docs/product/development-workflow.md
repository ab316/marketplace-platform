# Development Workflow

This workflow applies to new features, behavioral changes, cross-module interactions, integrations, financial flows, and significant refactors.

---

## Board Stages (GitHub Projects)

Each stage is a role gate. No item skips required gates.

| Stage                | Owner            | Slash Command    | Entry Criteria                                                                           |
| -------------------- | ---------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| 💡 Idea              | Scrum Master     | `/scrum-master`  | Raw issue captured, normalized fields present, triage started                            |
| 📝 Defined           | Product Owner    | `/product-owner` | User story, acceptance criteria, edge cases, domain area, financial impact, risk level   |
| 🧠 Risk Review       | CTO              | `/risk-review`   | Financial/idempotency/event/concurrency concerns reviewed, guardrails added              |
| 🏗 Architecture      | Architect        | `/architect`     | Bounded context, aggregates, invariants, events, state transitions, outbox needs defined |
| ✅ Ready             | Scrum Master     | `/scrum-master`  | Required fields complete, context links added, WIP constraints respected                 |
| 💻 Implementation    | Implementer      | `/implement`     | TDD for domain logic, no scope expansion, no architecture redesign                       |
| 🔥 Break It          | QA               | `/qa`            | Duplicate requests/events, concurrency, replay, and invariant tests designed             |
| 🚀 Production Review | Reviewer         | `/review`        | Correctness, safety, coverage, observability, and docs impacts reviewed                  |
| 🧾 Docs Sync         | Technical Writer | `/tech-writer`   | Merged change analyzed and documentation synchronized                                    |
| 🗂 Memory Updated    | Chronicler       | `/chronicler`    | PROJECT_STATE/worklog/summary updated with bounded context                               |
| 🎉 Done              | Scrum Master     | `/scrum-master`  | Acceptance criteria met, invariants preserved, issue closed with traceability links      |

WIP limits: Risk Review 3, Architecture 2, Implementation 2, Break It 2.

---

## Implementation Phases

### Phase 0 — Intake and Triage

- Capture or refine issue details.
- Deduplicate semantically similar issues.
- Classify domain/risk/financial impact.
- Set board metadata and initial stage.

### Phase 1 — Product Definition

- Create/update use case: `docs/product/use-cases/UC-XXX-<Name>.md`
- Validate with product vision/NFRs.

### Phase 2 — Domain Modeling

- Define aggregates, entities, value objects, domain events.
- Write invariants explicitly.

### Phase 3 — Architectural Design

- Define commands/queries.
- Define event strategy and transaction boundaries.

### Phase 4 — Implementation Order

1. Domain
2. Application
3. Infrastructure
4. Presentation
5. Tests
6. Observability

Never start with controllers, database schema, or external integrations.

### Phase 5 — QA and Production Review

- Run destructive test design.
- Run PR preflight checks and classify findings P0/P1/P2.

### Phase 6 — Post-Merge Documentation

- Update changelog and architecture/product docs via `/tech-writer`.

### Phase 7 — Memory Compression and Closeout

- Update `docs/PROJECT_STATE.md` and ops memory docs via `/chronicler`.
- Close issue via `/scrum-master` after docs/memory gates complete.

---

## Intake Checklist

- [ ] Issue normalized (template fields complete)
- [ ] Dedup check complete
- [ ] Risk/domain classification set
- [ ] Backlog aging status recorded

## Pre-Coding Checklist

- [ ] Use-case written or updated
- [ ] Module identified
- [ ] Invariants defined
- [ ] Commands/queries defined
- [ ] Event strategy defined
- [ ] Context links added (`PROJECT_STATE`, relevant history)

## Pre-Merge Checklist

- [ ] Tests added
- [ ] Observability added
- [ ] Docs impact identified
- [ ] No architecture violations

## Post-Merge Checklist

- [ ] `/tech-writer` completed
- [ ] `/chronicler` completed
- [ ] Issue closed with traceability links
