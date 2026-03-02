# Development Workflow

This workflow applies to new features, behavioral changes, cross-module interactions, integrations, financial flows, and significant refactors.

---

## Board Stages (GitHub Projects)

Each stage is a role gate. No item skips stages.

| Stage                | Owner         | Slash Command    | Entry Criteria                                                                           |
| -------------------- | ------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| 💡 Idea              | Anyone        | —                | Short description                                                                        |
| 📝 Defined           | Product Owner | `/product-owner` | User story, acceptance criteria, edge cases, domain area, financial impact, risk level   |
| 🧠 Risk Review       | CTO           | `/risk-review`   | Financial/idempotency/event/concurrency concerns reviewed, guardrails added              |
| 🏗 Architecture      | Architect     | `/architect`     | Bounded context, aggregates, invariants, events, state transitions, outbox needs defined |
| ✅ Ready             | —             | —                | All above stages complete, fields set correctly                                          |
| 💻 Implementation    | Developer     | `/implement`     | TDD for domain logic, no scope expansion, no architecture redesign                       |
| 🔥 Break It          | QA            | `/qa`            | Duplicate requests, duplicate events, concurrency, replay, financial invariants tested   |
| 🚀 Production Review | —             | `/review`        | Logging, metrics, migration safety, backward compatibility verified                      |
| 🎉 Done              | —             | —                | Acceptance criteria met, invariants preserved, observable                                |

WIP limits: Architecture 2, Implementation 2, Break It 2, Risk Review 3.

---

## Implementation Phases

### Phase 0 — Clarify Intent

- Classify: new capability / behavior change / integration / infra / refactor?
- Validate against product vision and NFRs.
- If architectural impact → ADR required.

### Phase 1 — Product Definition

- Create/update use case: `docs/product/use-cases/UC-XXX-<Name>.md`
- Identify owning module. If new module → create folder, README, register in `MODULE_CATALOG.md`.

### Phase 2 — Domain Modeling

- Define aggregates, entities, value objects, domain events.
- Write down invariants explicitly. Add to module README under "Invariants."

### Phase 3 — Architectural Design

- Define commands/queries (CQRS).
- Define event strategy: domain events (internal, same transaction) vs integration events (outbox, versioned, registered in `EVENT_CATALOG.md`).
- Define transaction boundaries (application layer edge).

### Phase 4 — Implementation Order

1. Domain → 2. Application → 3. Infrastructure → 4. Presentation → 5. Tests → 6. Observability

Never start with controllers, database schema, or external integrations.

### Phase 5 — Testing

- **Unit**: domain invariants, aggregate behavior, command handlers.
- **Integration**: repository, outbox, messaging changes.
- **API**: endpoint additions/modifications, validation, response schema.

### Phase 6 — Observability

- Structured logs with correlation ID.
- Meaningful error logs. No sensitive data in logs.
- Metrics for critical flows.

### Phase 7 — Documentation

- Module README, EVENT_CATALOG.md, MODULE_CATALOG.md, use-case doc, ADR, diagrams — update as needed.

---

## Pre-Coding Checklist

- [ ] Use-case written
- [ ] Module identified
- [ ] Invariants defined
- [ ] Commands/queries defined
- [ ] Event strategy defined
- [ ] ADR written (if required)

## Pre-Merge Checklist

- [ ] Tests added
- [ ] Observability added
- [ ] Docs updated
- [ ] No architecture violations
