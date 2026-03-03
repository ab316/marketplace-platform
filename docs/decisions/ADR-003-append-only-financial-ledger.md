# ADR-003: Append-Only Financial Ledger

Date: 2026-03-03  
Status: Accepted  
Owners: Platform Team

## Context

The platform handles financial flows including deposits, escrow, captures, refunds, withdrawals, and platform fees. The roadmap (Phase 2) calls for a double-entry ledger with escrow accounts and reversal entries.

Key requirements:

- Financial state transitions must be transactional (NFR §3).
- No double charging, no inconsistent order states (Engineering Handbook §4).
- Immutable audit trail for financial events (NFR §9).
- Order/payment lifecycle reconstructible (NFR §9).
- Idempotency for all external callbacks (Engineering Handbook §4).

Double-entry bookkeeping has an inherent constraint: **entries are never modified or deleted**. Corrections are made by posting reversing entries. This makes the journal entries table naturally append-only — structurally equivalent to an event-sourced model.

## Decision

The financial ledger module will use an **append-only journal entries model** as its persistence strategy, diverging from the default state-based approach defined in ADR-002.

Concretely:

1. **Journal entries table** is the source of truth. It is append-only and immutable — no UPDATE or DELETE operations are permitted. Each entry records a debit or credit against an account.

2. **Account balances table** is a derived projection. It caches the current balance for each account for query performance. It can be rebuilt entirely from journal entries.

3. **Corrections and refunds** are modeled as new reversing journal entries, never as mutations to existing entries.

4. **All entries within a financial transaction** (e.g., buyer debit + escrow credit) are written in the same database transaction to maintain double-entry integrity.

5. **Integration events** for financial state changes still follow the transactional outbox pattern defined in ADR-002.

This is not "Event Sourcing" in the DDD/CQRS sense (no event store, no aggregate streams, no projection infrastructure). It is standard **immutable append-only ledger** design — the same approach used by accounting systems and fintech platforms.

## Consequences

### Positive

- Perfect, inherent audit trail — every financial event is an immutable journal entry.
- Lifecycle reconstruction by querying journal entries for any account or transaction.
- Balance at any point in time is derivable by summing entries up to that timestamp.
- No data loss risk from mutations — entries are never changed.
- Aligns naturally with the domain model of double-entry bookkeeping.
- Account balances projection provides fast reads for typical queries.

### Negative / Trade-offs

- Storage grows indefinitely (mitigated by archival strategy if volume warrants it).
- Balance queries require a maintained projection; stale projection = stale balance (mitigated by updating in the same transaction).
- Different persistence model from other modules — developers must understand the distinction.

## Alternatives considered

1. State-based with event history (ADR-002 default)
   - Pros: Consistent with other modules. Simpler mental model for developers.
   - Cons: Mutable state tables conflict with accounting invariant that entries are immutable. Would require additional discipline to prevent mutations. Loses the natural append-only audit trail.

2. Full Event Sourcing with event store infrastructure
   - Pros: Formal event sourcing tooling (snapshots, projections, replay).
   - Cons: Unnecessary infrastructure overhead. The journal entries table already serves as the event log. Adding an event store on top adds complexity without proportional benefit.

## Notes / Links

- Related ADRs: ADR-001 (Modular Monolith), ADR-002 (Persistence & Event Strategy)
- Related diagrams: N/A
- Related PRs/issues: N/A
