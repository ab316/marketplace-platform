# core-runtime

**Role:** Shared, reusable **runtime implementations** of cross-cutting concerns defined in `@<your-scope>/core-contracts`.

This package contains concrete implementations and helpers that are useful across modules and (optionally) across apps, such as:

- outbox processing utilities (framework-agnostic where possible)
- idempotency helpers (at-least-once delivery + dedupe patterns)
- message envelope + serialization defaults
- in-process implementations for local/dev/testing
- logging/tracing adapters glue (thin wrappers)

It is allowed to have IO, but it must remain **generic** and **not module-specific**.

---

## Goals

- Provide reusable implementations so modules don’t duplicate common plumbing.
- Keep modules focused on domain logic and use-cases, not infrastructure mechanics.
- Enable consistent patterns across the backend (outbox, idempotency, messaging).
- Support swapping underlying technologies while keeping module code stable.

---

## Non-Goals

- This is NOT a dumping ground for random utilities.
- No module-specific business logic (belongs in the module).
- No direct coupling to a single bounded context’s persistence schema.
- No app bootstrap/DI composition (belongs in `apps/backend/src/bootstrap`).
- No UI/frontend code.

---

## Hard Rules (Authoritative)

### 1) Must implement contracts

Most exported implementations SHOULD implement interfaces from `@<your-scope>/core-contracts`.
If something does not map to a contract, it must justify its existence as a generic helper.

### 2) Keep it generic

Code here must be reusable by multiple modules without knowing their domain concepts.
If it needs domain knowledge (Order, Payment, User…), it does NOT belong here.

### 3) Avoid framework lock-in

Framework-specific adapters are allowed, but:

- Prefer thin adapters over deep coupling.
- Keep a “core” that is framework-agnostic where possible.
- Avoid leaking ORM/web framework types into the public API.

### 4) Stable public API

- Export a small set of primitives.
- Prefer additive changes.
- Do not churn frequently; many modules may depend on this.

---

## What belongs here

### Outbox (generic)

- Outbox record/envelope helpers
- A generic outbox processor loop (poll/claim/process)
- Retry/backoff strategy helpers
- Serialization helpers for event payloads
- Publisher adapter that takes persisted outbox records and publishes via an `IMessageBus`/`IPublisher`

**Important:** the storage details (SQL tables, ORM model definitions) should stay in module/app infrastructure.
Core-runtime may provide logic like:

- “given a list of outbox records, publish them safely”
- “given a transaction boundary, enqueue outbox rows”

### Idempotency (generic)

- Idempotency key conventions (helpers)
- Generic dedupe execution wrappers (e.g., “execute once per key”)
- Helpers that use an `IIdempotencyStore`

### Messaging (generic)

- Message envelope defaults (correlation id, causation id, timestamps)
- Serializer/deserializer defaults
- Topic naming helpers (pure)
- In-memory message bus for tests/dev (optional)

### Observability glue (generic)

- Logger adapters implementing `ILogger`
- Minimal tracing wrappers implementing `ITracer` interfaces
- Correlation ID propagation helpers (framework-agnostic; framework bindings should stay thin)

### Testing helpers (optional)

- Fakes/stubs implementing core-contracts ports for unit/integration tests

---

## What does NOT belong here

- Domain primitives (Entity, ValueObject) → `@<your-scope>/core-domain`
- Ports/interfaces → `@<your-scope>/core-contracts`
- Decorators → `packages/decorators`
- ORM models/migrations for a specific database schema
- HTTP controllers/middleware
- Module-specific mappers, policies, invariants
- “helpers” that only one module uses

Rule of thumb:

- If a change requires mentioning a module name (`orders`, `payments`), it doesn’t belong here.

---

## How modules should use core-runtime

### Application layer

- Prefer depending on `core-contracts` only.
- Application SHOULD NOT import `core-runtime` unless it is a pure helper with no IO and no infra coupling.

### Infrastructure layer (recommended)

- Infrastructure adapters MAY use `core-runtime` implementations directly, e.g.:
  - outbox publisher runner
  - idempotency wrapper
  - serializer

---

## Example usage patterns (conceptual)

### Outbox publishing

1. Module infrastructure persists integration event to outbox within the same DB transaction as the state change.
2. An outbox processor reads pending rows.
3. `core-runtime` publishes to messaging via a `core-contracts` publisher/bus.
4. Processor marks rows as published (or retries).

### At-least-once delivery + idempotent consumers

- Consumers are assumed to receive messages at-least-once.
- `core-runtime` provides helpers to ensure handlers are executed once per idempotency key using an `IIdempotencyStore`.

---

## Versioning / Change Policy

- Backward compatibility preferred.
- When introducing a new cross-cutting mechanism (e.g., a new outbox strategy):
  - Add an ADR if it changes architectural direction.
  - Keep existing APIs stable until migration is complete.

---

## Testing Expectations

- Implementations should have unit tests for:
  - retry behavior
  - serialization
  - idempotency semantics
- Avoid slow integration tests here unless necessary.
- Tech-specific integrations (Redis/NATS/DB) are better tested in `apps/backend` integration tests, using core-runtime as a dependency.

---

## Ownership

This package is shared infrastructure. It affects many modules.
Changes should be conservative, reviewed carefully, and documented when they impact behavior.
