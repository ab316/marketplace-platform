# UC-012: Buyer Views a Listing's Details

Owner: product (catalog/discovery)
Status: Implemented
Surfaces: API ✓ · Web ✓
Last updated: 2026-11-07

The first slice of the [buyer discovery spec](../feature-specs/buyer-discovery.md) (approved 2026-11-07; decisions D1 and D4, shaped with the [ordering spec](../feature-specs/buyer-ordering.md) whose D5 settles the sign-in handoff). It takes over step **B2** of [UC-001](UC-001-buyer-orders-refurbished-laptop.md), which settled the detail page as a precondition of ordering rather than a destination of its own, and it is where [UC-006](UC-006-buyer-searches-the-catalogue.md) B8 lands. Placing the order stays UC-001's.

Implemented on both surfaces on 2026-11-07: the API half has existed since Phase 1 (`GET /api/listings/:listingId`, which now also names the seller), and `/listings/[listingId]` in `apps/web` is the buyer's page, reached from catalogue cards that are now links — closing [#15](https://github.com/ab316/marketplace-platform/issues/15). Design contract: [`buyer-listing-detail.md`](../../design/buyer-listing-detail.md).

**One gap against V7:** ordering does not exist in the browser yet, so where the order action belongs the page says ordering opens with the next release. The viewers who may _not_ order (A4) are already told why. The sign-in handoff (A3) arrives with the ordering slice.

## Goal

A buyer reads everything a published listing promises — what the laptop is, what condition it is in, what it costs, who is selling it, and whether it can be ordered — and decides whether to order it.

## Primary Actor

- Buyer (anonymous or signed in)

## Stakeholders

- **Buyer** — wants to judge the laptop and the seller without surprises, before committing anything.
- **Seller organization** — wants every disclosure it published, and its name, presented accurately.
- **Marketplace operator** — wants what the buyer saw to be exactly what the publish bar enforced, so a later dispute can be judged against it.

## Preconditions

- The listing is published (`Active` or `Archived`) and its organization is active.
- No sign-in is required.

## Trigger

A buyer opens a listing — from a catalogue result, a shared or bookmarked link, or a link from one of their orders.

## Main Flow

1. **V1.** The buyer opens the listing.
2. **V2.** The product shows what the laptop is: title, description, brand, model, CPU, memory, storage type and capacity, and screen size.
3. **V3.** It shows the condition: the grade with its plain-language meaning in the same words the [business rules](../business-rules-policies.md#condition-grades) define, the guaranteed battery health floor, the guaranteed battery cycle range when the seller gave one, and the known defects. Grades are stated as cosmetic floors, never as a judgement of function.
4. **V4.** It shows the price in SEK and the seller's fulfillment expectations — what happens after payment, and roughly when.
5. **V5.** It shows **who is selling**: the name of the selling organization. The section is the buyer's view of the counterparty and is expected to carry more over time (trust signals are P2-005).
6. **V6.** It shows whether the listing can be ordered: available to order, currently unavailable, or no longer sold (A1, A2).
7. **V7.** It offers the next step for this buyer: order it (continuing with [UC-001](UC-001-buyer-orders-refurbished-laptop.md)), sign in first (A3), or the reason there is no order action (A1, A2, A4).
8. **V8.** It offers the way back to the catalogue, preserving the refinements the buyer arrived with, so a search survives a detour into a listing ([UC-006](UC-006-buyer-searches-the-catalogue.md) B6).

## Alternate / Error Flows

### A1: The listing has no units available

- Condition: every unit is reserved or sold at V6.
- Steps: the whole listing is still shown, stated prominently as currently unavailable, with the explanation that units can come back if a reservation lapses. No order action is offered.
- Outcome: the buyer understands the listing exists and is simply taken, rather than hitting a dead action or an error. Nothing is reserved by looking.

### A2: The listing is archived

- Condition: the seller archived the listing ([UC-009](UC-009-seller-archives-listing.md)).
- Steps: the whole listing is still shown, stated as no longer sold, with no order action.
- Outcome: links from old orders, shared links, and bookmarks keep resolving to what was promised, instead of becoming dead ends.

### A3: An anonymous buyer wants to order

- Condition: the buyer is not signed in and chooses to order at V7.
- Steps: the buyer is sent to sign in and returned to this listing afterwards. No order is placed on their behalf; they order from the listing as a signed-in buyer (spec D5).
- Outcome: reading stays open to everyone and committing requires an account, with no lost context.

### A4: The viewer cannot order this listing

- Condition: the viewer is a member of the selling organization, or a platform admin (spec D3).
- Steps: the listing is shown in full with the reason there is no order action — it belongs to their own organization, or staff do not place orders.
- Outcome: no dead button and no misleading affordance. A member of a different organization sees the normal order action.

### A5: Only the owner can see this listing

- Condition: the listing is a draft, or its organization is deactivated, and the viewer is neither a member of that organization nor an operator.
- Steps: the buyer is told the listing is not available, in the same way an unknown listing is. A member of the owning organization, or an operator, sees the listing ([UC-005](UC-005-seller-creates-listing-draft.md), [UC-003](UC-003-seller-organization-and-member-management.md) E6).
- Outcome: a draft is invisible outside its organization, and a deactivated seller has no shareable, unorderable listing.

### E1: Unknown listing

- Condition: the identifier does not exist or is malformed.
- Steps: the buyer is told the listing is not available, indistinguishably from A5, and is offered the catalogue.
- Outcome: no enumeration of what exists; the buyer is never stranded.

### E2: The listing cannot be loaded

- Condition: the product cannot reach the listing data.
- Steps: the buyer sees that something went wrong and can retry the same listing; the error is not confused with "not available".
- Outcome: a transient failure never reads as a sold-out or deleted listing.

## Postconditions

- No state changes. Viewing a listing never reserves, holds, or alters stock, and never records buyer-identifying interest.
- What the buyer saw is exactly what publishing enforced: the [required listing fields](../business-rules-policies.md#required-listing-fields), unchanged since publication.

## Data / Validations

### Inputs

- The listing identifier. The viewer's identity, when signed in, decides only which next step is offered (V7) and whether a draft or deactivated seller's listing is visible (A5).

### Rules

- Only published listings (`Active`, `Archived`) are visible to buyers; drafts and deactivated sellers' listings are not (A5).
- A listing's content is immutable after publication, so the page is a faithful view of the offer.
- Availability is derived, never stored on display: available = published quantity − reserved − sold.
- Prices are SEK minor units and are never shown in öre.
- Condition grades are shown as cosmetic floors with their defined wording; the letter is never the only signal.
- Viewing is an unauthenticated read; search results and page views are a point-in-time view, never a reservation ([UC-006](UC-006-buyer-searches-the-catalogue.md) A3).

### Outputs

- The listing's disclosures, price, availability, and selling organization's name.
- The next step available to this viewer.

## Observability

- Logs: listing-detail reads need no buyer-identifying log; failures (E2) are logged with the listing id.
- Metrics: listing-detail views, views of unavailable listings (A1/A2) as a share of views — a rising share means the catalogue is serving stale results — and the detail-to-order rate once ordering ships.
- Traces: the read is a single query; no cross-module work.

## Security / Compliance

- Auth: none required. Signing in changes only the offered next step.
- Authorization: drafts and deactivated sellers' listings are restricted to the owning organization's members and operators (A5); a restricted listing is indistinguishable from an unknown one (E1).
- Privacy: the seller's name is the only organization data exposed to buyers. No member names, contact details, or internal identifiers beyond the organization id.
- Audit: none; this is a read.

## Mapping to Architecture

- Queries: `Catalog.GetListingDetail` (exists); resolving the selling organization's name for buyer-facing responses is the P1-020 addition.
- Commands, domain events, integration events: none — this use case writes nothing.
- Persistence: `listings`, plus a read of the organization's name.
