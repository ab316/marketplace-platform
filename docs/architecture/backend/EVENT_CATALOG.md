# Backend Event Catalog (Integration Events)

Integration events are versioned, e.g. `OrderPlaced.v1`.

For each event include:

- Producer module
- Consumer module(s)
- Schema/payload fields (high level)
- Compatibility notes (breaking/non-breaking)

## Events

- No integration events registered yet.

Catalog status note:

- As of 2026-10-24, the `listings` and `orders` modules are implemented (UC-001) but publish no
  integration events. The two collaborate synchronously through the orders module's
  `ListingReservations` port, adapted over the listings module's public API, because stock
  reservation must be immediate and consistent rather than eventually consistent.
- As of 2026-10-25, the `ledger` and `payments` modules are implemented (UC-004, Phase 4) and
  likewise publish no integration events. Payment outcomes move orders through synchronous calls
  over composition-root adapters (ADR-009 §3–§4), because the transactional outbox is deliberately
  deferred to the roadmap's "Backend reliability" block.
- The first expected integration events are `OrderPlaced.v1` and `OrderPaid.v1`, needed once a
  consumer other than the synchronous caller exists (Phase 5 notifications/settlement). They must
  be persisted through the transactional outbox and registered here before any producer code is
  written.
