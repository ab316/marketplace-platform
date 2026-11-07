# Listings Module

Location: `apps/backend/src/modules/listings/`

Bounded context: refurbished-laptop offers from seller organizations, including their pooled stock
and reservations. Implements seller listing management
([spec](../../../../../docs/product/feature-specs/seller-listing-management.md); UC-005, UC-007–UC-010)
and the listing side of
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

- `CreateListingDraft` — create an unpublished listing for the actor's organization with any subset
  of fields, including none (UC-005, P1-012). Returns the listing view.
- `UpdateListingDraft` — edit a draft with merge-patch semantics (`null` clears; nested objects
  merge; `application/draft-patch.ts`). Rejected once published (UC-007).
- `PublishListing` — make a draft active and orderable. Rejected with every missing or invalid field
  at once (`ListingIncompleteError`, UC-008).
- `ArchiveListing` — withdraw an active listing from the catalogue.
- `ReserveListingUnit` — hold one unit. Used by the orders module; not exposed over HTTP.
- `ReleaseListingUnit` — return one held unit. Used by the orders module; not exposed over HTTP.
- `MarkReservedUnitSold` — convert one held unit into a sold one when its order is paid (UC-004).
  Used by the orders module; not exposed over HTTP.

## Queries

- `BrowseActiveListings` — active listings only, optional keyword over title, description, brand,
  and model.
- `GetListingDetail` — one listing; drafts are visible only to the owning organization and staff.
- `ListOrganizationListings` — the seller's listings in every status, drafts with their readiness
  (UC-010).

Views: `ListingView` is a union. `DraftListingView` may be incomplete and carries `readiness`;
`PublishedListingView` is always complete and is what the catalogue and reservations return.

---

# 3. Domain Model

## Aggregates

- `Listing` (`domain/listing.ts`)
  - Root entity: Listing
  - Invariants:
    - `reservedQuantity >= 0`, `soldQuantity >= 0`, `reservedQuantity + soldQuantity <= totalQuantity` —
      stock can never oversell, and a sold unit never returns to stock (PD-0004 §4).
    - Only an **active** listing can reserve a unit.
    - Buyer-visible content is editable only while the listing is a **draft**.
    - A draft may be incomplete; an **active** or **archived** listing never is. The publish bar is
      `inspectCompleteness` in `domain/listing.ts` (business rules, "Required listing fields").
    - Every value present is well-formed, in every status: price positive, quantity at least one,
      battery health 1–100, cycle range not inverted, no blank text. `none` is an explicit valid
      answer for known defects.
    - A draft never holds stock (only an active listing can reserve).
    - Brand must be on the curated list (`domain/brands.ts`, mirrored from `CATALOGUE_BRANDS`
      by a parity test) to publish (P1-017). A draft may hold a pre-list brand; the write
      contract refuses new off-list values.
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
`quantity_reserved + quantity_sold <= quantity_total`, that a published row has every disclosure
(`listings_published_complete`), and that a draft holds no stock (`listings_draft_holds_no_stock`).

---

# 8. Cross-Module Collaboration

### orders

Mechanism: the orders module depends on its own `ListingReservations` port. The adapter over
`ReserveListingUnit` / `ReleaseListingUnit` / `MarkReservedUnitSold` is built in
`src/bootstrap/listing-reservations.ts`, so neither module imports the other.

---

# 9. Testing

- Domain invariants: `test/unit/listings/listing.unit.spec.ts`
- Draft merge semantics: `test/unit/listings/draft-patch.unit.spec.ts`
- HTTP behavior: `test/integration/api/listings.api.int.spec.ts`
- Database guarantees (published rows complete, drafts hold no stock):
  `test/integration/persistence/listings.persistence.int.spec.ts`

---

# 10. Known Gaps

- Draft edits are last-write-wins across requests: the client does not send the version it edited
  (spec D11). Truly simultaneous saves still conflict on the version guard.
- Discarding a draft (UC-011, P1-018) is not built.
- Archived listings cannot be re-published (by design).
