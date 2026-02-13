# Backend Architecture Map (Authoritative)

Backend location: apps/backend

Architecture:

- Modular monolith
- Domain Driven Design (DDD)
- Clean Architecture (layered)
- CQRS (commands/queries)
- Event-driven internally
- Outbox pattern for integration events

---

## 1) Bounded Context Modules

All backend bounded contexts (“modules”) live under:

apps/backend/src/modules/<module>/

Each module MUST contain:

- domain/
- application/
- infrastructure/
- presentation/

Modules MUST NOT import other modules' infrastructure/ or presentation/ layers.
Cross-module collaboration MUST go through:

- public application APIs (commands/queries), OR
- integration events (outbox), OR
- shared abstractions/packages.

---

## 2) Layer Responsibilities

### domain/

MUST:

- Contain business rules, invariants, aggregates, entities, value objects, domain services, domain events.
  MUST NOT:
- Perform IO (DB/network/files)
- Import infrastructure/presentation code
- Import framework libraries (Fastify, Sequelize, Redis, NATS, etc.)

### application/

MUST:

- Implement use-cases (CQRS command/query handlers)
- Orchestrate domain operations
- Define ports needed by the module (if module-specific)
  MUST NOT:
- Perform direct IO
- Import infrastructure/presentation
  MAY:
- Depend on packages/core-contracts for cross-cutting ports
- Use UnitOfWork/transaction boundary at application edge

### infrastructure/

MUST:

- Implement ports (repositories, cache, external clients, message bus publishers/subscribers)
- Contain ORM models/migrations, outbox persistence, idempotency persistence
  MAY:
- Depend on packages/core-runtime for shared implementations
  MUST NOT:
- Be imported by presentation layer

### presentation/

MUST:

- Define HTTP routes/controllers/middleware
- Validate/parse incoming requests (schema/DTO boundary)
- Call application layer only
  MUST NOT:
- Access DB/external systems directly
- Import infrastructure layer directly

---

## 3) Dependency Direction (Hard)

Allowed direction:

- domain → (none)
- application → domain + packages/core-contracts (+ packages/core-domain)
- infrastructure → application + domain + packages/core-contracts (+ packages/core-runtime)
- presentation → application (+ apps/backend/src/shared/presentation)

Forbidden:

- domain importing infrastructure/presentation
- application importing infrastructure/presentation
- presentation importing infrastructure
- module A importing module B’s infrastructure/presentation

---

## 4) Shared Code Policy

Backend-shared, cross-module (backend-only):

- apps/backend/src/shared/<layer>/

Cross-app reusable:

- packages/\*

Rules:

- Shared code MUST be generic and stable
- Module-specific logic MUST remain inside that module
- Prefer module-local first; promote to shared only when needed

---

## 5) Events

### Domain events (internal)

- Raised inside aggregates/entities
- Handled synchronously (same transaction)
- Never published externally

### Integration events (cross-module/external)

- MUST be persisted via outbox
- MUST NOT be published from domain layer
- SHOULD be versioned: `EventName.v1`
- When adding/changing integration events:
  - Update EVENT_CATALOG.md
  - Update producer/consumer module READMEs

Registries:

- docs/architecture/backend/MODULE_CATALOG.md
- docs/architecture/backend/EVENT_CATALOG.md

---

## 6) Transactions & Unit of Work

- Transaction boundaries belong at application edge (command handlers / use-cases).
- Domain must remain transaction-agnostic.
- Integration event handlers must be idempotent (or follow idempotency conventions when implemented).

---

## 7) Testing Policy

When modifying code:

- domain/application changes → unit tests required
- infrastructure changes → integration tests required
- presentation changes → API tests required

Suggested locations:

- apps/backend/test/unit
- apps/backend/test/integration
- apps/backend/test/api

---

## 8) How to add a new module (Checklist)

1. Create folder: apps/backend/src/modules/<module>/
2. Add layers: domain/, application/, infrastructure/, presentation/
3. Create module README: apps/backend/src/modules/<module>/README.md
4. Register module: docs/architecture/backend/MODULE_CATALOG.md
5. If events are involved:
   - Add to docs/architecture/backend/EVENT_CATALOG.md
   - Document Publishes/Consumes in module README
6. Add tests for new logic at correct level
