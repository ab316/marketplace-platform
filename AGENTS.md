# AGENTS.md

This repository is a PNPM monorepo:

- apps/backend → Node.js backend (Modular Monolith, DDD, Clean Architecture)
- apps/web → Next.js frontend
- packages/\* → Shared libraries (domain primitives, contracts, runtime helpers, decorators)

Architecture maps (authoritative):

- docs/architecture/REPO_MAP.md
- docs/architecture/backend/REPO_MAP.md
- docs/architecture/web/REPO_MAP.md

When editing code, follow this file as a strict policy.

---

## 0) Operating Mode

- Make the smallest correct change.
- Preserve existing patterns and naming conventions.
- Never “re-architect” without explicit instruction.
- Prefer additive changes (new files) over disruptive moves.
- Do not change public contracts (API/event schemas) unless asked.

---

## 1) Workspace Boundaries (Hard)

Allowed:

- apps/_ may import packages/_
- packages/_ MUST NOT import apps/_
- apps/backend MUST NOT import apps/web and vice versa

---

## 2) Backend Architecture Policy (apps/backend)

### 2.1 Bounded Context Modules

Backend code is organized as bounded contexts (“modules”):

apps/backend/src/modules/<module>/

Each module MUST contain layers:

- domain/
- application/
- infrastructure/
- presentation/

Modules MUST NOT import other modules’ infrastructure/ or presentation/.
Cross-module calls MUST go through:

- application APIs (commands/queries), OR
- integration events (outbox), OR
- shared cross-cutting packages/interfaces.

### 2.2 Layer Rules (Strict)

domain/

- Pure business logic only
- MUST NOT perform IO
- MUST NOT import framework libraries (Fastify/Sequelize/Redis/NATS/etc.)
- MAY import packages/core-domain (Entity/VO base)
- MAY define domain events and invariants

application/

- Commands/queries/use-cases and orchestration
- Depends on: domain + packages/core-contracts
- MUST NOT talk to DB/network directly
- Defines ports/interfaces required by the module (if module-specific)
- Uses UnitOfWork/Transaction boundary at application edge (not in domain)

infrastructure/

- Implements ports (DB repos, HTTP clients, message bus adapters)
- Contains ORM models/migrations, outbox, idempotency storage
- Depends on: application + domain + core-contracts (+ core-runtime)

presentation/

- HTTP controllers/routes, request/response schemas
- Depends on: application only (plus shared presentation helpers)
- MUST NOT call infrastructure directly

### 2.3 Import Dependency Direction

Allowed direction:

- domain → (nothing)
- application → domain + packages/core-contracts (+ packages/core-domain)
- infrastructure → application + domain + packages/core-contracts (+ packages/core-runtime)
- presentation → application (+ shared/presentation)

Forbidden:

- domain → infrastructure/presentation
- application → infrastructure/presentation
- presentation → infrastructure
- module A → module B’s infrastructure/presentation

---

## 3) Shared Code Policy

### 3.1 Where shared code lives

Cross-module backend shared code (still backend-specific):
apps/backend/src/shared/<layer>/

Cross-app reusable code:
packages/\*

### 3.2 Rules for shared code

- Shared code MUST be generic and stable.
- If logic is domain-specific to one module, it MUST live in that module.
- Shared code MUST NOT become a “dumping ground”.
- If uncertain, keep it module-local.

---

## 4) Contracts, Ports, and Implementations

- packages/core-contracts: ports/interfaces/types ONLY (no implementations)
- packages/core-domain: domain primitives ONLY (Entity, ValueObject, base events, errors)
- packages/core-runtime: reusable implementations (outbox helpers, idempotency helpers, tracing/logging glue)
- packages/decorators: cross-cutting decorators (transaction, tracing, validation). Keep thin.

Rule:

- Ports live in application (module-local) unless clearly cross-cutting → core-contracts.
- Implementations live in infrastructure (module-local) unless reusable → core-runtime.

---

## 5) Events Policy

### 5.1 Domain Events

- Internal only
- Raised within aggregates/entities
- Handled synchronously (same transaction) via domain event dispatcher

### 5.2 Integration Events

- Cross-module and external integration
- MUST be persisted via outbox before publish
- MUST have versioned names and schemas (e.g., `OrderPlaced.v1`)
- Publishing MUST NOT happen from domain layer

### 5.3 Event Registry (Required)

When adding/changing integration events:

- Update docs/architecture/backend/EVENT_CATALOG.md (or module README “Publishes/Consumes”)
- Keep event payloads backward compatible when possible

---

## 6) Module Registry (Required)

When adding a new module:

- Create apps/backend/src/modules/<module>/README.md
- Add module entry to docs/architecture/backend/MODULE_CATALOG.md
- Include:
  - responsibilities
  - owned aggregates/entities
  - commands/queries (public API)
  - publishes/consumes integration events
  - required ports

---

## 7) API Contracts

- API schemas live near presentation layer.
- If you generate OpenAPI, keep schemas in one place and link to handlers.
- Do not break request/response shapes without explicit instruction.
- If changing API, update tests.

---

## 8) Testing Policy

When modifying logic:

- Domain/application changes → unit tests required
- Infrastructure changes → integration tests required
- Presentation/API changes → API tests required
- Do not delete tests without a clear replacement

Where tests go (guideline):

- Unit: apps/backend/test/unit and/or module-local **tests**
- Integration: apps/backend/test/integration
- API/E2E: apps/backend/test/api

---

## 9) Change Protocol (Safety)

Safe changes (do freely):

- Add tests
- Bug fixes within a layer
- Add new command/query handlers without altering boundaries
- Add new adapters implementing existing ports

Requires explicit instruction:

- Moving code across layers
- Changing module boundaries
- Renaming event contracts / changing payload shape
- Introducing new cross-cutting package
- Replacing infrastructure technology

---

## 10) Decision Heuristics (Routing)

If code:

- enforces invariants / business rules → domain
- orchestrates workflows / transactions → application
- talks to DB/external services → infrastructure
- handles HTTP / serialization / auth middleware → presentation
- reused across modules (backend-only) → apps/backend/src/shared/<layer>
- reused across apps → packages/\*
