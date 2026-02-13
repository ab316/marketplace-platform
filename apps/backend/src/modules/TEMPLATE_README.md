# <ModuleName> Module

Location:
apps/backend/src/modules/<module>/

Bounded Context:
<Short description of what business capability this module owns>

---

# 1. Responsibilities (Authoritative)

This module is responsible for:

- ...
- ...
- ...

This module is NOT responsible for:

- ...
- ...

The module is the single source of truth for:

- <Aggregate or business concept>

---

# 2. Public API (Application Layer)

Other modules may interact with this module ONLY via:

## Commands

- <CommandName>
  - Purpose:
  - Input:
  - Output:
  - Transaction boundary: Yes/No

- ...

## Queries

- <QueryName>
  - Purpose:
  - Input:
  - Output:

No other internal classes should be used externally.

---

# 3. Domain Model

## Aggregates

- <AggregateName>
  - Root entity:
  - Invariants:
  - Lifecycle states:

## Entities

- ...

## Value Objects

- ...

## Domain Services

- ...

---

# 4. Events

## Domain Events (Internal Only)

- <DomainEventName>
  - Triggered when:
  - Handled by:
  - Transaction: Same transaction

Domain events MUST NOT be published externally.

---

## Integration Events (External / Cross-Module)

### Publishes

- <IntegrationEventName>.v1
  - Triggered when:
  - Payload (high-level fields):
  - Published via: outbox
  - Versioning policy: backward compatible

### Consumes

- <IntegrationEventName>.v1
  - Producer module:
  - Handler location:
  - Idempotency strategy:

When adding or modifying integration events:

- Update docs/architecture/backend/EVENT_CATALOG.md
- Ensure backward compatibility if possible

---

# 5. Ports (Application Layer Interfaces)

This module requires the following ports:

- <PortName>
  - Purpose:
  - Defined in:
    - module-local application/ports OR
    - packages/core-contracts (if cross-cutting)

Port implementations live in:
infrastructure/

---

# 6. Persistence

Database tables owned by this module:

- <table_name>
- <table_name>

ORM models located in:
infrastructure/persistence/

Repositories:

- Interface location:
  - domain/ OR application/ (depending on design)
- Implementation:
  - infrastructure/persistence/

This module MUST NOT access other modules' tables directly.

Cross-module data access MUST use:

- application queries, OR
- integration events

---

# 7. Transactions & Unit of Work

Transaction boundary:

- Command handlers (application layer)

Domain:

- Must remain transaction-agnostic

Integration event publishing:

- MUST go through outbox
- MUST NOT occur directly in domain layer

---

# 8. Cross-Module Collaboration

This module interacts with:

### <OtherModule>

Mechanism:

- Command call / Query call / Integration event

Direct infrastructure imports are forbidden.

---

# 9. Testing Strategy

## Unit Tests

- Domain logic
- Application command handlers

## Integration Tests

- Repository implementations
- Event publishing/outbox behavior

## API Tests

- Controllers
- Request/response validation

Tests located in:

- apps/backend/test/<type>
  OR module-local **tests** if preferred

---

# 10. Invariants & Critical Business Rules

Document important invariants here:

- ...
- ...
- ...

This helps prevent accidental breaking changes by future edits.

---

# 11. Extension Points

Safe to extend:

- Add new commands
- Add new queries
- Add new event handlers

Requires discussion:

- Changing aggregate invariants
- Changing integration event payloads
- Moving logic across layers

---

# 12. Dependency Summary (Machine-Friendly)

Layer imports allowed:

- domain → none
- application → domain + packages/core-contracts
- infrastructure → application + domain + core-runtime
- presentation → application

Forbidden:

- domain → infrastructure/presentation
- application → infrastructure/presentation
- cross-module infrastructure imports

# Quick Routing Guide (for Agents)

If adding:

- Business rule → domain/
- Orchestration logic → application/
- DB/external API → infrastructure/
- HTTP endpoint → presentation/
- Cross-module event → integration event + outbox
