# core-contracts

Role: Cross-cutting ports and interfaces shared across the monorepo.

This package defines framework-free contracts (TypeScript interfaces and types) for capabilities needed by the application layer.

Examples:

- Persistence abstractions (UnitOfWork, Transaction)
- Messaging abstractions (EventBus, Publisher, Subscriber)
- Cache abstractions
- Idempotency store interfaces
- Clock and ID generation interfaces
- Logger and tracing interfaces

These are ports in Clean Architecture terms.

---

## Goals

- Allow modules to depend on abstractions instead of implementations.
- Keep application code testable via mocks.
- Enable swapping infrastructure implementations safely.
- Support future service extraction without rewriting core logic.

---

## Non-Goals

- No concrete implementations.
- No infrastructure clients.
- No framework dependencies.
- No domain primitives.
- No runtime wiring or configuration.

---

## Hard Rules (Authoritative)

### 1) Interfaces and Types Only

This package MUST contain:

- TypeScript interfaces
- Type aliases
- Small data structures

It MUST NOT contain:

- Concrete runtime logic
- Database clients
- Messaging clients
- Network calls
- Singleton implementations

### 2) No Framework Dependencies

Do NOT import:

- Web frameworks
- ORMs
- Redis/NATS clients
- Observability SDKs

Define interfaces instead.

### 3) No IO

No network, filesystem, timers, or environment config.

### 4) Stable Contracts

- Prefer additive changes.
- Avoid breaking changes.
- Keep interfaces small and composable.
- Avoid “god interfaces”.

---

## What Belongs Here

- IUnitOfWork
- ITransaction
- IMessageBus / IPublisher / ISubscriber
- ICacheBackend
- ISimpleCache
- IClock
- IIdGenerator
- IIdempotencyStore
- ILogger
- ITracer
- MessageEnvelope type

---

## What Does NOT Belong Here

- Domain primitives (→ core-domain)
- Implementations (→ core-runtime or module infrastructure)
- Decorators (→ packages/decorators)
- Module-specific ports used by only one module

Rule of thumb:

If only one module needs the interface, define it inside that module’s application layer.

If 2+ modules need it, consider placing it here.

---

## Usage Guidance

Application layer should import ports from here.

Infrastructure layer should implement these interfaces.

Domain layer should generally remain independent of these abstractions unless strictly necessary.

---

## Contract Design Principles

- Keep interfaces minimal.
- Do not leak ORM-specific types.
- Do not leak framework-specific types.
- Prefer explicit method names.
- Favor small composable interfaces over large multi-purpose ones.

---

## Versioning & Change Policy

- Additive changes preferred.
- Breaking changes require coordinated updates.
- Architectural-impacting changes may require ADR.

---

## Testing

- Usually minimal testing required.
- Focus on clarity and type correctness.
- No integration tests here.

---

## Ownership

This package defines contracts used widely across the system.
Changes must be reviewed carefully to avoid ripple effects.
