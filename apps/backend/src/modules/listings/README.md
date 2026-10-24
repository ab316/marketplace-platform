# Listings Module

Location: `apps/backend/src/modules/listings/`

Bounded context: refurbished-laptop listings offered by seller organizations — drafting, required-disclosure publishing, archiving, buyer discovery, and pooled-stock availability ([UC-001](../../../../../docs/product/use-cases/UC-001-buyer-orders-refurbished-laptop.md)).

## Responsibilities

- Listing lifecycle: `draft → active → archived`.
- Publish validation: all required disclosures (specs, condition grade + guarantees, known defects, price in SEK öre, quantity, fulfillment expectations) must be present.
- Pooled-stock availability: reserving and releasing one unit at a time; stock never negative.
- Buyer discovery: browse/search of active listings.

Not responsible for: orders, payments, organization/user management.

Single source of truth for: the `Listing` aggregate and the `listings` table.

## Public API (application layer)

Created by `createListingsModule()` in `listings.module.ts` (ADR-007). Other modules use only this service.

Commands: `createListingDraft`, `updateListingDraft`, `publishListing`, `archiveListing`, `reserveListingUnit`, `releaseListingUnit`.
Queries: `browseActiveListings`, `getListing`.

`reserveListingUnit`/`releaseListingUnit` exist for the orders module; reservation retries on version conflict so a request only fails when stock is genuinely exhausted.

## Domain model

- **Listing** (aggregate root) — invariants:
  - Only drafts can be edited or published; only active listings can be archived.
  - Publishing requires all disclosure fields; it opens `quantityAvailable = quantity`.
  - Units can only be reserved from active listings with `quantityAvailable ≥ 1`.
  - Releases are bounded by total quantity; archived listings keep accurate counts.

## Events

Publishes/consumes no integration events yet.

## Persistence

- Table: `listings` (owned). Repository port in `application/ports.ts`; Kysely implementation in `infrastructure/`.
- Concurrency: optimistic locking via a `version` column (`ListingVersionConflictError` on stale writes) — this is what prevents overselling pooled stock.

## Known limitations (UC-001 scope)

- Authorization is header-based demo identity (`x-organization-id`), not real auth.
- No DB transactions yet; single-statement writes plus optimistic locking carry the invariants.
