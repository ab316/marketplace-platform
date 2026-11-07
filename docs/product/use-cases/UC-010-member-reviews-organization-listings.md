# UC-010: Member Reviews the Organization's Listings

Owner: product (listings)
Status: Implemented
Surfaces: API, Web
Last updated: 2026-11-07

Part of [seller listing management](../feature-specs/seller-listing-management.md). New: UC-001 never described the seller's view of their own listings.

**Current behavior vs this use case:** implemented on the API and the web (2026-11-07): `/seller/listings` lists every status, newest first, with stock for published listings and readiness for drafts ([design](../../design/seller-listing-management.md)).

## Goal

A member of a seller organization sees every listing the organization has, what state each is in, and how much stock is left.

## Primary Actor

- Seller organization member, any role (owner, manager, or viewer)

## Stakeholders

- **Seller organization** — needs one place to see what is live, what needs work, and what has sold.
- **Marketplace operator** — sees the same listings through the operator surface (UC-003 A1), not through this use case.

## Preconditions

- The actor is signed in and is a member of a seller organization, active or deactivated.

## Trigger

The member opens their organization's listings.

## Main Flow

1. The member opens the organization's listings.
2. The product shows every listing of the organization in every status (`Draft`, `Active`, `Archived`), newest created first, with the total count, a page at a time.
3. Each listing shows:
   - its title ("Untitled draft" when there is none), brand and model, price, and status;
   - for a draft, its readiness: "Ready to publish", or the number of required fields still missing;
   - for an active or archived listing, its stock as available, reserved, and sold out of the total quantity, and its publication or archive date.
4. An active listing with no available units is marked as not in the catalogue, with the reason: units reserved by unpaid orders, or all sold.
5. The member opens any listing to see everything it holds, including every disclosure as buyers see it.
6. The actions offered follow the member's role and the listing's status. An owner or manager can create a listing, edit or publish a draft, and archive an active listing. A viewer is offered no action.

## Alternate / Error Flows

### A1: No listings yet

- Condition: the organization has no listings.
- Steps: the product explains there is nothing yet. An owner or manager is offered "Create your first listing". A viewer is told that owners and managers create listings.
- Outcome: no empty list without an explanation.

### A2: Organization deactivated

- Condition: the organization has been deactivated.
- Steps: listings remain readable, with a banner explaining the deactivation (UC-003 E6). No write action is offered to anyone.
- Outcome: members keep their records; nothing can change.

### A3: Paging past the end

- Condition: a page beyond the last one is requested, usually from a stale link.
- Steps: the product shows an empty page with the true total and a way back to the first page.
- Outcome: no error.

### E1: Not a member

- Condition: the actor is signed out, belongs to no organization, or is a platform admin.
- Steps: a signed-out user is sent to sign in. A user with no organization is sent to create one (UC-003). A platform admin uses the operator surface instead.
- Outcome: no listing is shown.

### E2: Another organization's listing

- Condition: the member opens a listing, by link or id, that belongs to a different organization.
- Steps: it is treated like any public listing. A draft is not found, and an active or archived listing shows only what buyers see, with no seller actions.
- Outcome: no other organization's private data is revealed.

## Postconditions

- Nothing changes. Reviewing is a read.

## Data / Validations

- Inputs: page.
- Rules: all statuses are included. The order is newest created first, with a stable tiebreak so paging never repeats or skips a listing. Readiness uses the same publish bar as [UC-008](UC-008-seller-publishes-listing.md).
- Outputs: listings with status, price, stock (available, reserved, sold, total), readiness for drafts, relevant dates, and the total count.

## Observability

- Logs: none beyond standard request logs.
- Metrics: listing page views per organization; drafts older than 14 days (input to P1-018).

## Security / Compliance

- Auth: signed in.
- Authorization: membership of the organization, any role. Deactivated organizations stay readable to their members.
- Audit: none. Nothing is changed.

## Non-Goals (this use case)

- Searching or filtering by status (P2-022); orders per listing and the seller dashboard (P0-015); seller analytics (P2-003); activity history (P1-019).
- Operator views of an organization's listings (UC-003 A1).

## Success Metric

A member can tell at a glance which listings are live and selling, which drafts are ready to publish, and which listings have run out.

## Mapping to Architecture

- Queries: `Listings.ListOrganizationListings` (as built), extended with draft readiness; `Listings.GetListingDetail` for the member's own listings (as built)
