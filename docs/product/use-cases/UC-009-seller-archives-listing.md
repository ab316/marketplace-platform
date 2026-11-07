# UC-009: Seller Archives a Listing

Owner: product (listings)
Status: Implemented
Surfaces: API, Web
Last updated: 2026-11-07

Part of [seller listing management](../feature-specs/seller-listing-management.md). Takes over the seller's side of alternate flow A5 of [UC-001](UC-001-buyer-orders-refurbished-laptop.md). UC-001 keeps what archiving means for buyers and their orders (A4, A5).

**Current behavior vs this use case:** implemented on the API and the web (2026-11-07), including the confirmation step ([design](../../design/seller-listing-management.md)).

## Goal

A seller stops a published listing from taking new orders without disturbing orders already placed.

## Primary Actor

- Seller organization member with listing permission (owner or manager)

## Stakeholders

- **Seller organization** — wants to stop selling a model it can no longer supply.
- **Buyer with an open order** — must keep exactly what they ordered.
- **Marketplace operator** — wants archived listings kept for inspection.

## Preconditions

- The actor is signed in and is an owner or manager of an active seller organization.
- An `Active` listing of that organization exists.

## Trigger

The seller chooses to archive an active listing.

## Main Flow

1. The seller chooses to archive an active listing.
2. The product explains what happens: the listing leaves the catalogue and takes no new orders, open orders continue unchanged, and archiving cannot be undone. The seller confirms.
3. The product checks that the listing is still `Active`.
4. The listing becomes `Archived` and its archive time is recorded.
5. It disappears from the catalogue. A buyer opening it directly is told it is no longer available (UC-001 A4).
6. The seller sees it as `Archived`, with its stock as it stands.

## Alternate / Error Flows

### A1: Open orders on the listing

- Condition: the listing has unpaid orders holding reservations, or paid orders.
- Steps: archiving proceeds. Each order keeps its snapshot and reservation (UC-001 A5) and continues through its lifecycle. If an unpaid order is cancelled or expires, its unit returns to the archived listing's stock but can never be ordered again.
- Outcome: no order is changed by archiving.

### E1: The listing is a draft

- Condition: the seller tries to archive a listing that was never published.
- Steps: refused. A draft is discarded, not archived (P1-018, not yet available).
- Outcome: nothing changes.

### E2: Already archived

- Condition: the listing is already `Archived`, for example after a double click or another member archiving first.
- Steps: the product reports the listing's actual state.
- Outcome: nothing changes. No second archive time is recorded.

### E3: Not allowed

- Condition: the actor is signed out, is a viewer, belongs to a different organization, or is a platform admin.
- Steps: the action is refused. A listing of another organization is not revealed.
- Outcome: nothing changes.

### E4: Organization deactivated

- Condition: the actor's organization has been deactivated. Its listings are already hidden from buyers.
- Steps: the action is refused (UC-003 E6).
- Outcome: nothing changes.

## Postconditions

- The listing is `Archived` permanently: no edit, no re-publish, no new orders.
- It stays visible to the organization's members and to operators.
- Every existing order is exactly as it was.

## Data / Validations

- Inputs: none.
- Rules: only an `Active` listing can be archived. Archived is terminal.
- Outputs: the archived listing.

## Observability

- Logs: listing archived (actor, organization, listing, open order count).
- Metrics: listings archived; archive-then-recreate rate (spec success metrics).

## Security / Compliance

- Auth: signed in.
- Authorization: owner or manager of the organization owning the listing, which must be active.
- Audit: the archive time is recorded. Which member archived is not recorded yet (P1-019).

## Non-Goals (this use case)

- Re-publishing or un-archiving; archiving several listings at once; archiving by operators.
- Cancelling or refunding open orders as part of archiving.

## Success Metric

A seller withdraws a listing in two clicks, and every order placed before it was archived completes exactly as if nothing had happened.

## Mapping to Architecture

- Commands: `Listings.ArchiveListing` (as built)
- Domain events: `ListingArchived` (internal; no integration event)
