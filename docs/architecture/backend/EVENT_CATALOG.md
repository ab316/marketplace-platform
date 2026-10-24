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
- The first expected integration event is `OrderPlaced.v1`, needed once payments react to orders
  (Phase 3). It must be persisted through the transactional outbox and registered here before any
  producer code is written.
