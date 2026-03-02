# core-domain

Role: Framework-free domain primitives shared across the monorepo.

This package provides small, stable building blocks used by domain layers across modules:

- Entity
- AggregateRoot
- ValueObject
- DomainEvent (base type)
- DomainError types
- Invariant/guard helpers
- Identity helpers (e.g., UniqueEntityId)

It must remain pure and portable.

---

## Goals

- Provide reusable domain primitives so modules don’t re-invent patterns.
- Keep domain layers consistent across all bounded contexts.
- Enable future extraction of modules/services without rewriting domain logic.
- Keep domain code expressive and framework-independent.

---

## Non-Goals

- No infrastructure code (DB, HTTP, messaging, cache, queues).
- No framework bindings (Fastify, Express, Sequelize, Redis, NATS, etc.).
- No application-layer patterns (CQRS handlers, orchestration).
- No runtime wiring or DI configuration.
- No module-specific domain models.

---

## Hard Rules (Authoritative)

### 1) No IO

This package MUST NOT perform:

- Network calls
- File access
- Timers/cron
- Environment configuration access

### 2) No framework dependencies

This package MUST NOT import:

- Web frameworks
- ORMs
- Message broker SDKs
- Cache clients
- Observability SDKs

### 3) Stable Public API

- Prefer additive changes.
- Avoid breaking changes.
- Keep exports small and predictable.
- Do not churn APIs frequently.

### 4) Side-Effect Free

- No global state.
- No module-level initialization.
- No hidden runtime behavior.

---

## What Belongs Here

- Base domain classes (Entity, AggregateRoot, ValueObject)
- Base DomainEvent abstraction
- Domain-level errors (InvariantError, DomainError)
- Guard helpers (invariant, assert, etc.)
- Identity primitives (if generic)

---

## What Does NOT Belong Here

- Repository interfaces (→ core-contracts or module-local ports)
- UnitOfWork / Transaction abstractions (→ core-contracts)
- Outbox or idempotency logic (→ core-runtime)
- Decorators (→ packages/decorators)
- DTO validation schemas (presentation/application layer)
- Module-specific business logic

Rule of thumb:

If it mentions a specific module or business concept, it does NOT belong here.

---

## Import Guidance

Intended consumers:

- apps/backend/src/modules/\*/domain
- apps/backend/src/shared/domain

Application layer MAY use base types if needed.

Infrastructure and presentation layers should not depend on domain primitives for transport concerns.

---

## Versioning & Change Policy

- Additive changes preferred.
- Breaking changes require careful coordination.
- If a breaking change is necessary:
  - Explain in PR
  - Update all consumers in same PR
  - Consider ADR if architectural impact exists

---

## Testing

- Unit tests only.
- Must remain deterministic and fast.
- No integration tests here.

---

## Ownership

This package is foundational.
Changes should be conservative and carefully reviewed.
