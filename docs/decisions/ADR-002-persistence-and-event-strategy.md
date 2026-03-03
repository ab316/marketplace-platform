# ADR-002: Persistence & Event Strategy

Date: 2026-03-03  
Status: Accepted  
Owners: Platform Team

## Context

The platform uses DDD with CQRS and an event-driven architecture. We need to decide how state is persisted and how events (domain and integration) are stored and published.

Key requirements:

- Internal state changes must be strongly consistent (NFR §3).
- Cross-module communication must be eventually consistent via integration events (NFR §3).
- Financial operations must be transactional and idempotent (Vision, NFR §1).
- Integration events must not be lost on crash (NFR §1).
- Event history must be retrievable and order/payment lifecycles must be reconstructible (NFR §9).
- Immutable audit trail for financial events (NFR §9).
- Architecture must remain clear and evolutionary, avoiding premature complexity (Core Principles, ADR-001).

## Decision

We will use **state-based persistence with event history** as the default persistence strategy across all modules (with a specific exception for the financial ledger — see ADR-003).

Concretely:

1. **State tables** are the source of truth for current entity state. Each aggregate is persisted to a normal PostgreSQL table with standard CRUD semantics.

2. **Event history tables** are append-only tables that record every domain event raised by an aggregate. These are written in the same transaction as the state change. They serve as the audit trail and enable lifecycle reconstruction.

3. **Domain events** are raised inside aggregates and handled synchronously within the same database transaction for intra-module side effects.

4. **Integration events** are published via the transactional outbox pattern. The outbox entry is written in the same transaction as the state and event history writes.

5. **Integration events must be versioned** and registered in EVENT_CATALOG.md.

This architecture is commonly described as **event-driven DDD with CQRS and transactional outbox**.

## Consequences

### Positive

- Current state is a simple SELECT — fast reads, simple debugging, straightforward queries.
- Append-only event history provides full audit trail and lifecycle reconstruction without the complexity of event sourcing.
- Single transaction covers state change, event history, and outbox — no event loss, strong consistency.
- Aligns with "Clarity > Cleverness" and "Evolutionary Architecture" — no exotic infrastructure required.
- Individual modules can be promoted to full event sourcing in the future if justified, without affecting the rest of the system.

### Negative / Trade-offs

- Event history is not the source of truth — state cannot be rebuilt solely from events without additional discipline.
- Dual writes (state table + event history) within the same transaction add minor write overhead.
- Time-travel debugging requires querying the event history table rather than being built in.

## Alternatives considered

1. Full Event Sourcing (all modules)
   - Pros: Perfect audit trail, time-travel, retroactive projections.
   - Cons: Significant complexity increase for Phase 1A. Every module needs projection infrastructure. Schema evolution for immutable events is painful. Contradicts "Clarity > Cleverness" and "Avoid over-engineering". Overkill for CRUD-like modules (Users, Listings).

2. State-based only (no event history)
   - Pros: Simplest approach, minimal write overhead.
   - Cons: No audit trail. Cannot reconstruct entity lifecycle. Does not satisfy NFR §9 (event history retrievable, lifecycle reconstructible, immutable audit trail).

## Notes / Links

- Related ADRs: ADR-001 (Modular Monolith), ADR-003 (Append-Only Financial Ledger), ADR-004 (NATS JetStream Messaging)
- Related diagrams: N/A
- Related PRs/issues: N/A
