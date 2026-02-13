# Feature Development Workflow (Authoritative)

This workflow MUST be followed for every non-trivial feature.

It ensures:

- Alignment with product vision
- Compliance with non-functional requirements
- Preservation of DDD boundaries
- Architectural stability
- Financial correctness
- Observability
- Proper documentation

This workflow applies to:

- New features
- Behavioral changes
- Cross-module interactions
- New integrations
- Financial flows
- Significant refactors

---

# Phase 0 — Clarify Intent

## 0.1 Identify Feature Type

Determine whether the change is:

- New domain capability
- Modification of existing behavior
- New integration
- Infrastructure enhancement
- Observability improvement
- Refactor (internal only)

If architectural impact is expected → ADR REQUIRED.

---

## 0.2 Validate Against Vision & NFR

Before design:

- Does this align with the Product Vision?
- Does it violate any Non-Functional Requirements?
- Does it introduce architectural drift?
- Does it compromise financial safety?

If yes → redesign before implementation.

---

# Phase 1 — Product Definition

## 1.1 Write or Update Use Case

Create or update:

docs/product/use-cases/UC-XXX-FeatureName.md

Include:

- Actor
- Preconditions
- Main flow
- Alternate/error flows
- Postconditions
- Mapping to commands/events

No coding begins before use-case clarity.

---

## 1.2 Identify Module Ownership

Answer:

- Which module owns this behavior?
- Does it cross module boundaries?
- Is a new module required?

If new module:

- Create module folder
- Add module README
- Register in MODULE_CATALOG.md

---

# Phase 2 — Domain Modeling

Domain is designed BEFORE infrastructure.

## 2.1 Identify Domain Concepts

Define:

- Aggregate(s)
- Entities
- Value Objects
- Domain Services
- Domain Events

Update:

apps/backend/src/modules/< module >/README.md

---

## 2.2 Define Invariants Explicitly

Write down:

- What must always be true?
- What state transitions are allowed?
- What is forbidden?

Add to module README under:

"Invariants & Critical Business Rules"

---

# Phase 3 — Architectural Design

## 3.1 Define Commands and Queries (CQRS)

For state changes:

- Define Command
- Define Command Handler
- Define transaction boundary (application layer)

For reads:

- Define Query
- Keep separate from write logic

---

## 3.2 Define Event Strategy

If cross-module:

- Define Integration Event
- Version it (e.g., EventName.v1)
- Register in EVENT_CATALOG.md
- Use Outbox pattern

If internal:

- Use Domain Event
- Handled within same transaction

Integration events MUST NOT be emitted from domain layer.

---

## 3.3 Define Transaction Boundaries

- Transaction lives in application layer
- Domain must remain transaction-agnostic
- Integration events must be persisted via outbox

If introducing new infrastructure patterns → ADR required.

---

# Phase 4 — Implementation Order

Implementation MUST follow this order:

1. Domain layer
2. Application layer
3. Infrastructure layer
4. Presentation layer
5. Tests
6. Observability additions

Never start with:

- Controller first
- Database schema first
- Direct external integration first

---

# Phase 5 — Testing

## 5.1 Unit Tests

Required for:

- Domain invariants
- Aggregate behavior
- Command handler logic (mocked ports)

## 5.2 Integration Tests

Required when:

- Repository logic changes
- Outbox behavior changes
- Messaging integration changes

## 5.3 API Tests

Required when:

- Endpoint is added/modified
- Validation logic changes
- Response schema changes

Test pyramid must be respected.

---

# Phase 6 — Observability

Before merge:

- Add structured logs
- Include correlation ID
- Add metrics (if critical)
- Ensure error logs are meaningful
- Verify no sensitive data is logged

Financial flows require extra observability.

---

# Phase 7 — Documentation Updates

Before merging:

- Update module README
- Update EVENT_CATALOG.md (if integration event added/changed)
- Update MODULE_CATALOG.md (if new module)
- Update use-case document
- Add ADR if architectural decision was made
- Update diagrams if flow changed

Documentation is part of the feature.

---

# Phase 8 — Architecture Safety Review

Verify:

- No cross-layer violations
- No cross-module infrastructure imports
- No unversioned integration events
- No broken invariants
- No circular dependencies
- No direct IO inside domain

If any violation exists → fix before merge.

---

# Phase 9 — Merge & Post-Merge Validation

After deployment:

- Monitor logs
- Check metrics
- Confirm integration events flow
- Validate financial correctness
- Ensure no unexpected side effects

---

# Short Feature Checklist

Before coding:

- [ ] Use-case written
- [ ] Module identified
- [ ] Invariants defined
- [ ] Commands/queries defined
- [ ] Event strategy defined
- [ ] ADR written (if required)

Before merging:

- [ ] Tests added
- [ ] Observability added
- [ ] Docs updated
- [ ] No architecture violations

---
