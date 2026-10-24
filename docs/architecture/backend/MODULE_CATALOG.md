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

- Responsibilities: Refurbished-laptop listing lifecycle (draft/publish/archive), required disclosures, pooled-stock reservation, buyer discovery (UC-001).
- Owned aggregates/entities: `Listing`.
- Public commands/queries: `createListingDraft`, `updateListingDraft`, `publishListing`, `archiveListing`, `reserveListingUnit`, `releaseListingUnit`; `browseActiveListings`, `getListing`.
- Publishes/Consumes integration events: None.
- Required ports: `ListingRepository`, `Clock`, `IdGenerator`.

### orders

- Responsibilities: Buyer orders with immutable listing snapshot, `awaiting_payment`/`cancelled` states, 24h expiry rule, order timeline (UC-001).
- Owned aggregates/entities: `Order` (with timeline entries).
- Public commands/queries: `createOrder`, `cancelOrder`; `getOrder`.
- Publishes/Consumes integration events: None.
- Required ports: `OrderRepository`, `ListingsGateway` (listings public API), `Clock`, `IdGenerator`.

### identity

- Responsibilities: Scaffolded module directory; domain behavior not implemented yet.
- Owned aggregates/entities: None registered yet.
- Public commands/queries: None registered yet.
- Publishes/Consumes integration events: None registered yet.
- Required ports: None registered yet.

### shared

- Responsibilities: Scaffolded module directory; domain behavior not implemented yet.
- Owned aggregates/entities: None registered yet.
- Public commands/queries: None registered yet.
- Publishes/Consumes integration events: None registered yet.
- Required ports: None registered yet.
