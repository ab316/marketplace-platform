# Orders Module

Location: `apps/backend/src/modules/orders/`

Bounded context: a buyer's commitment to one unit of a listing, and the visible history of what
happened to it. Implements the buyer side of
[UC-001](../../../../../docs/product/use-cases/UC-001-buyer-orders-refurbished-laptop.md).

---

# 1. Responsibilities

This module is responsible for:

- Placing an order for exactly one unit, in `awaiting_payment`.
- The immutable listing snapshot that records what the buyer was promised.
- The reservation window (24 hours) and expiry of unpaid orders.
- Cancelling unpaid orders and returning their unit to stock.
- The order timeline: what happened, when, who caused it, and what happens next.
- Who may read an order (its buyer, and the selling organization).

This module is NOT responsible for:

- Listing content or stock accounting — those belong to the listings module.
- Payment, escrow, fulfillment, confirmation, or release (later phases).

Single source of truth for: **Order** and its timeline.

---

# 2. Public API

Declared in `orders.api.ts` and built by `orders.module.ts`.

## Commands

- `CreateOrder` — reserve one unit, snapshot the listing, and place the order in
  `awaiting_payment`. Transaction boundary: no; see Transactions below.
- `CancelOrder` — buyer cancellation of an unpaid order; releases the unit.
- `ExpireOverdueOrders` — batch sweep that cancels overdue unpaid orders and releases their units.
  Driven by `src/jobs/reservation-expiry-job.ts`, not by HTTP.

## Queries

- `GetOrder` — one order with its timeline, for the buyer or the selling organization.
- `ListBuyerOrders` — the signed-in buyer's orders.

---

# 3. Domain Model

## Aggregates

- `Order` (`domain/order.ts`)
  - Root entity: Order
  - Invariants:
    - An order always covers exactly one unit.
    - Only an order awaiting payment can be cancelled, and cancellation is terminal.
    - Every status change appends a timeline entry, so history is never partial.
    - Expiry must be in the future when the order is placed.
  - Lifecycle states: `awaiting_payment`, `cancelled`

## Entities / value objects

- `TimelineEntry` — append-only, sequence-numbered record of a visible change.
- `ListingSnapshot` — the promised content, owned by this module and never mutated.

---

# 4. Events

## Domain events

None yet.

## Integration events

### Publishes

None. `OrderPlaced.v1` becomes necessary once another module reacts to orders (payments, in
Phase 3); it must go through the outbox and be registered in
`docs/architecture/backend/EVENT_CATALOG.md` at that point.

### Consumes

None.

---

# 5. Ports

- `OrderRepository` (`application/ports.ts`) — load, insert, optimistically save, list by buyer,
  find overdue. Implemented in `infrastructure/persistence/`.
- `ListingReservations` (`application/ports.ts`) — reserve/release a unit. Implemented by the
  adapter in `src/bootstrap/listing-reservations.ts` over the listings module's public API.

---

# 6. Persistence

Tables owned by this module:

- `orders`
- `order_timeline_entries`

Implementations in `infrastructure/persistence/`:

- `PgOrderRepository` — Kysely over the migrated schema (ADR-006).
- `InMemoryOrderRepository` — used by the `memory` persistence mode and tests.

The listing snapshot is stored as `jsonb` and validated with a schema on read, because the database
cannot enforce the structure of `jsonb` and the snapshot is what the buyer was promised.

---

# 7. Transactions & Concurrency

Every `orders` row carries a `version`; `save` updates only when the stored version still matches,
raising `OrderConcurrencyError` otherwise.

`PgOrderRepository` writes the order row and its timeline entries in one database transaction,
because they form a single aggregate. Timeline inserts use
`ON CONFLICT (order_id, sequence) DO NOTHING`, so replaying a write cannot duplicate history.

**Known gap:** reserving a unit and inserting the order are two separate writes with no shared
transaction (UC-001 scope). `CreateOrder` compensates by releasing the unit if the order write
fails, and `CancelOrder` ends the order before releasing its unit, so the failure modes leave stock
unsold rather than an order without a reservation. A real transaction boundary across modules needs
the unit-of-work decision that ADR-007 left open.

---

# 8. Cross-Module Collaboration

### listings

Mechanism: command calls through the `ListingReservations` port. No direct import in either
direction.

---

# 9. Testing

- Domain invariants: `test/unit/orders/order.unit.spec.ts`
- HTTP behavior, including the no-oversell race: `test/integration/api/orders.api.int.spec.ts`
- Time-driven expiry: `test/integration/application/reservation-expiry.application.int.spec.ts`

---

# 10. Known Gaps

- No payment, so `awaiting_payment` is currently terminal except through cancellation or expiry.
- Timeline wording is rendered in the presentation layer, so it is not localisable yet.
