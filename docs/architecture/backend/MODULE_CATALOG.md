# Backend Module Catalog

Each module is a bounded context under: apps/backend/src/modules/<module>/

For each module include:

- Responsibilities
- Owned aggregates/entities
- Public commands/queries
- Publishes/Consumes integration events
- Required ports

## Modules

### listings

- Responsibilities: refurbished-laptop listings, their required disclosures, the
  `draft → active → archived` lifecycle, pooled stock, and unit reservation/release. Owns the
  buyer-facing catalogue. Implements the seller side of UC-001.
- Owned aggregates/entities: `Listing` (including its stock).
- Public commands: `CreateListingDraft`, `UpdateListingDraft`, `PublishListing`, `ArchiveListing`,
  `ReserveListingUnit`, `ReleaseListingUnit`.
- Public queries: `BrowseActiveListings`, `GetListingDetail`, `ListOrganizationListings`.
- Publishes/Consumes integration events: none.
- Required ports: `ListingRepository`.
- Tables: `listings`.
- README: `apps/backend/src/modules/listings/README.md`

### orders

- Responsibilities: single-unit orders, the immutable listing snapshot, the 24-hour reservation
  window and its expiry, buyer cancellation, and the order timeline. Implements the buyer side of
  UC-001.
- Owned aggregates/entities: `Order`, `TimelineEntry`, `ListingSnapshot`.
- Public commands: `CreateOrder`, `CancelOrder`, `ExpireOverdueOrders`.
- Public queries: `GetOrder`, `ListBuyerOrders`.
- Publishes/Consumes integration events: none yet. `OrderPlaced.v1` becomes necessary when
  payments react to orders (Phase 3).
- Required ports: `OrderRepository`, `ListingReservations` (adapted over the listings module's
  public API in `src/bootstrap/listing-reservations.ts`).
- Tables: `orders`, `order_timeline_entries`.
- README: `apps/backend/src/modules/orders/README.md`

## Not yet implemented

- **identity** — user management, authentication, organizations, and membership. UC-001 uses the
  fixed actors in `apps/backend/src/shared/presentation/actors.ts` instead.
- **payments / ledger / fulfillment** — Phases 2–3.
