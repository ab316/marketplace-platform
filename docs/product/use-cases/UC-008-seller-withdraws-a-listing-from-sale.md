# UC-008: Seller Withdraws a Listing from Sale

Owner: product (listings)
Status: Implemented
Surfaces: API ✓ · Web ✓ (shipped 2026-11-01: the archive action on `/seller/listings/[id]`; design contract [`docs/design/seller-listing-management.md`](../../design/seller-listing-management.md))
Last updated: 2026-11-01

Carved out of [UC-001](UC-001-buyer-orders-refurbished-laptop.md) on 2026-11-01 under the operating model's sizing rule: UC-001's alternate flow A5 ("Seller archives a listing with stock") is the behavior this document now owns. The behavior is unchanged and is implemented by the Phase 1 backend. Publishing is [UC-007](UC-007-seller-publishes-a-listing.md).

## Goal

A seller organization member stops offering a listing so that no new orders can be placed on it, without disturbing orders that already exist.

## Primary Actor

- Seller organization member with listing permission (owner or manager)

## Stakeholders

- **Seller organization** — wants to stop selling a model (sold out elsewhere, superseded, mis-listed) immediately and safely.
- **Buyers with existing orders** — must keep exactly what they were promised; archiving is invisible to them.
- **Buyers browsing** — must never be able to order a withdrawn listing.
- **Marketplace operator** — needs the listing and its history to remain inspectable; nothing is deleted.

## Scope decisions (settled for this use case)

1. **Archiving is irreversible in the MVP.** There is no `Archived → Active`; to sell the same model again the seller publishes a new listing. Restocking an active listing instead of archiving it is [P1-011](../product-backlog.md).
2. **Only `Active` listings are archived.** A draft that is no longer wanted is simply left as a draft; deleting drafts is out of scope.
3. **Existing orders are untouched.** Unpaid orders keep their reservation and expire or are cancelled on their own schedule; paid orders proceed. The listing's reserved and sold counts therefore remain meaningful after archiving.

## Preconditions

- The actor is signed in and is an owner or manager of an `Active` seller organization ([UC-003](UC-003-seller-organization-and-member-management.md)).
- The listing is `Active` and owned by the actor's organization.

## Trigger

A seller member decides to stop selling the listing and chooses to archive it.

## Main Flow

1. **W1.** The member opens the listing from the organization's listing list and chooses to archive it.
2. **W2.** Because archiving cannot be undone, the member confirms the action. The confirmation states what will happen: the listing leaves the catalogue, new orders stop, existing orders continue, and the listing cannot be re-published.
3. **W3.** The listing becomes `Archived`; the archive time is recorded.
4. **W4.** The listing disappears from the catalogue ([UC-006](UC-006-buyer-searches-the-catalogue.md)) and refuses new orders ([UC-001](UC-001-buyer-orders-refurbished-laptop.md) A4). It remains visible to the organization's members and to marketplace staff, labelled `Archived`, with its stock counts intact.

## Alternate / Error Flows

### A1: Member cancels the confirmation

- Condition: at W2 the member backs out.
- Steps: nothing is sent.
- Outcome: the listing stays `Active`.

### A2: Listing already archived

- Condition: at W3 the listing is no longer `Active` (archived from another tab, or the page is stale).
- Steps: rejected with a state conflict; the page shows the listing's current status.
- Outcome: no change; the listing is `Archived` either way.

### A3: Listing has open unpaid orders

- Condition: at W1 one or more units are reserved by orders awaiting payment.
- Steps: archiving proceeds; the reservations are untouched. If such an order is later cancelled or expires, its unit returns to the archived listing's available count, where it can never be ordered again.
- Outcome: no buyer loses an order; no new buyer can place one.

### E1: Unauthorized actions

- Condition: a signed-out user, a buyer, a viewer-role member, a member of another organization, or a platform administrator tries to archive a listing.
- Steps: rejected with an authorization error. The web app shows no archive action to a viewer and shows the staff notice to an administrator.
- Outcome: no state change.

### E2: Deactivated organization

- Condition: the member's organization is `Deactivated` ([UC-003](UC-003-seller-organization-and-member-management.md) E6).
- Steps: rejected; reads remain available. The web app shows the deactivation banner and no write actions. A deactivated organization's listings are already hidden from buyers.
- Outcome: no change.

## Postconditions

- The listing is `Archived` with an archive timestamp; it is absent from the catalogue and refuses new orders.
- Existing orders, their snapshots, and their reservations are unchanged.
- The listing remains readable by the organization and by marketplace staff.

## Data / Validations

- Inputs: the listing to archive; a confirmed intent (W2 is a product requirement for the web surface, not an API field).
- Rules: `Active → Archived` only; no reverse transition; stock counters are not modified by archiving.
- Outputs: the archived listing detail; the organization's listing list showing it as `Archived`.

## Observability

- Logs: listing archived (actor, organization, listing IDs; reserved and available counts at the time).
- Metrics: listings archived.
- Audit: archiving is attributable to a member and timestamped.

## Security / Compliance

- Auth: requires a signed-in user.
- Authorization: membership in the owning organization with listing-write permission (owner or manager). Platform administrators read but never archive (UC-003 E7). A deactivated organization accepts no writes (E2).
- Audit: see Observability.

## Non-Goals (this use case)

- Re-publishing an archived listing; deleting drafts or listings.
- Operator-initiated archiving or takedowns (a later operator slice).
- Anything that happens to orders after archiving ([UC-001](UC-001-buyer-orders-refurbished-laptop.md) A1/A2, [UC-004](UC-004-buyer-pays-into-escrow.md)).

## Success Metric

A seller archives a listing with an open unpaid order; the listing is gone from the catalogue within one page load, the buyer's order page is unchanged, and the seller still sees the listing as `Archived` with one unit reserved.

## Mapping to Architecture

- Commands: `Listings.ArchiveListing`
- Queries: `Listings.GetListingDetail` (owner view), `Listings.ListOrganizationListings`
- Domain events: `ListingArchived` (not yet emitted; no subscriber)
- Integration events: none
- Persistence: `listings`
