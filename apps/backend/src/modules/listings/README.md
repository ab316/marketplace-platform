# Listings Module

Location: `apps/backend/src/modules/listings/`

Bounded context: refurbished-laptop offers from seller organizations, including their pooled stock
and reservations. Implements the seller side of
[UC-001](../../../../../docs/product/use-cases/UC-001-buyer-orders-refurbished-laptop.md).

---

# 1. Responsibilities

This module is responsible for:

- The listing lifecycle: `draft → active → archived`.
- Required disclosures and their validity (specifications, condition grade, condition guarantees,
  known defects, price, fulfillment expectations).
- Pooled stock: total quantity, reserved quantity, and availability.
- Reserving and releasing single units on behalf of orders.
- The buyer-facing catalogue (browse, keyword search, listing detail) and the seller's own listings.

This module is NOT responsible for:

- Orders, payment, or anything an order does after a unit is reserved.
- Identity, organization membership, or permissions (the caller supplies the acting organization).

Single source of truth for: **Listing** (including its stock).

---

# 2. Public API

Declared in `listings.api.ts` and built by `listings.module.ts`. Nothing else is public.

## Commands

- `CreateListingDraft` — create an unpublished listing for the actor's organization. Returns the
  listing view.
- `UpdateListingDraft` — edit a draft. Rejected once published.
- `PublishListing` — make a draft active and orderable. Re-validates every disclosure.
- `ArchiveListing` — withdraw an active listing from the catalogue.
- `ReserveListingUnit` — hold one unit. Used by the orders module; not exposed over HTTP.
- `ReleaseListingUnit` — return one held unit. Used by the orders module; not exposed over HTTP.

## Queries

- `BrowseActiveListings` — active listings only, optional keyword over title, description, brand,
  and model.
- `GetListingDetail` — one listing; drafts are visible only to the owning organization.
- `ListOrganizationListings` — the seller's listings in every status.

---

# 3. Domain Model

## Aggregates

- `Listing` (`domain/listing.ts`)
  - Root entity: Listing
  - Invariants:
    - `0 <= reservedQuantity <= totalQuantity` — stock can never oversell.
    - Only an **active** listing can reserve a unit.
    - Buyer-visible content is editable only while the listing is a **draft**.
    - Price must be positive; stock must start at one unit or more.
    - Condition guarantees must be coherent (battery health 1–100, cycle range not inverted).
    - Known defects must always be disclosed; `none` is an explicit valid answer.
  - Lifecycle states: `draft`, `active`, `archived`

## Value objects

- `Money` (`@acme/core-domain`) — SEK minor units only.
- `ListingSpecifications`, `ListingCondition`, `ConditionGuarantees` — structural disclosures.

---

# 4. Events

## Domain events

None yet. State changes are persisted directly; UC-001 has no in-process subscriber.

## Integration events

### Publishes

None. See `docs/architecture/backend/EVENT_CATALOG.md`.

### Consumes

None.

---

# 5. Ports

- `ListingRepository` (`application/ports.ts`) — load, insert, optimistically save, search active,
  list by organization. Implemented in `infrastructure/persistence/`.

---

# 6. Persistence

Tables owned by this module:

- `listings`

Implementations in `infrastructure/persistence/`:

- `PgListingRepository` — Kysely over the migrated schema (ADR-006).
- `InMemoryListingRepository` — used by the `memory` persistence mode and tests.

---

# 7. Transactions & Concurrency

Every `listings` row carries a `version`. `ListingRepository.save` updates only when the stored
version still matches the loaded one, and raises `ListingConcurrencyError` otherwise. Reserve and
release retry on that error with freshly read state, which is how two buyers racing for the last
unit resolve to exactly one winner. The database additionally enforces
`quantity_reserved <= quantity_total`.

---

# 8. Cross-Module Collaboration

### orders

Mechanism: the orders module depends on its own `ListingReservations` port. The adapter over
`ReserveListingUnit` / `ReleaseListingUnit` is built in `src/bootstrap/listing-reservations.ts`, so
neither module imports the other.

---

# 9. Testing

- Domain invariants: `test/unit/listings/listing.unit.spec.ts`
- HTTP behavior: `test/integration/api/listings.api.int.spec.ts`

---

# 10. Known Gaps

- Draft creation requires the full disclosure set, so a partially filled draft is rejected at
  creation rather than at publish. `Listing.publish` re-validates regardless.
- Archived listings cannot be re-published; out of scope for UC-001.
