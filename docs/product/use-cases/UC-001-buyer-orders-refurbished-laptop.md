# UC-001: Buyer Orders a Refurbished Laptop from a Published Listing

Owner: product (spans listings, catalog/discovery, ordering)
Status: Implemented
Last updated: 2026-10-25

The first stable use case for Phase 0/1 ([roadmap](../roadmap.md), [PD-0002](../decisions/0002-refurbished-computers.md), discovery "Slice A"). It covers the thin visible journey: a seller organization publishes a refurbished-laptop listing, a buyer discovers it and places an immediate order, and the order page shows `Awaiting payment` with a clear timeline and next step. Payment, escrow, and fulfillment are later slices.

## Goal

A buyer finds a refurbished laptop they can trust from its disclosures and places an order that clearly shows what happened and what happens next.

## Primary Actor

- Buyer (primary demo user)

Supporting actor: seller organization member (publishes the listing; required precondition flow).

## Stakeholders

- **Buyer** — wants enough disclosed information to buy without surprises, and visible order state.
- **Seller organization** — wants to publish pooled-stock listings and receive committed orders.
- **Marketplace operator** — wants order creation to be auditable (full inspection UI is a later slice).

## Scope decisions (settled for this use case)

These resolve the open questions from PD-0002 and discovery:

1. **Assortment:** refurbished **laptops only** for the first demo.
2. **Inventory model:** a listing is **pooled stock** of units with identical specifications and a shared condition guarantee. Units whose condition differs materially (e.g. battery health) belong on a different listing. Condition is expressed as **guarantee ranges/floors** (e.g. "battery health ≥ 90%", "battery cycles 100–300"), not per-unit values. These guarantee fields are a starting shape, not set in stone.
3. **Required disclosures:** see Data / Validations below — the bar is "the buyer can make an informed decision without surprises." Photos are deferred.
4. **Purchase mechanics:** **immediate order** from an active listing, **one unit per order**. No availability request, quote, offer flow, or multi-unit quantity (offers and carts deferred per MVP scope). May be revisited later.
5. **Reservation:** creating an order **reserves one unit** of the listing's stock. An unpaid order releases its unit when the buyer cancels it or when it **expires after 24 hours** unpaid. An automated expiry sweep is implemented; atomic cancellation and stock release remain pending backend reliability work. A payment in progress places a short hold that the sweep respects, and a successful payment converts the reserved unit to sold ([UC-004](UC-004-buyer-pays-into-escrow.md), [PD-0004](../decisions/0004-escrow-fee-and-payment-policy.md)).
6. **Currency: SEK only.** Prices are stored and returned as integer minor units (öre) with currency `SEK`. Multi-currency stays an MVP non-goal.

## Preconditions

- The seller organization exists with at least one member permitted to manage listings. (Account/organization setup is assumed infrastructure for this slice; the demo may use seeded users.)
- The buyer is signed in. (Anonymous browsing of active listings is allowed; ordering requires sign-in.)

## Trigger

A buyer viewing an active listing's detail page chooses to order it.

## Main Flow

Supporting flow — seller publishes (S1–S4):

1. **S1.** A seller member creates a listing draft for a laptop model, entering the required fields (see Data / Validations), including available quantity.
2. **S2.** The seller may edit the draft; drafts are not visible to buyers.
3. **S3.** The seller publishes the listing. Publishing validates that all required fields are present and quantity ≥ 1.
4. **S4.** The listing becomes `Active`: visible in browse/search and orderable.

Primary flow — buyer orders (B1–B7):

1. **B1.** The buyer browses active listings (optionally keyword search) and opens a listing detail page.
2. **B2.** The listing detail page shows all disclosures: specifications, condition grade and guarantees, known defects, price, fulfillment expectations, seller organization, and availability ("in stock" is sufficient; exact counts optional).
3. **B3.** The buyer places an order (quantity 1 — single-item orders only in MVP).
4. **B4.** The system verifies the listing is still `Active` with at least one unreserved unit, then atomically reserves one unit and creates the order in `Awaiting payment`.
5. **B5.** The order captures a snapshot of the listing's buyer-relevant content (title, specs, condition guarantees, known defects, price, fulfillment expectations) so later listing edits cannot change what the buyer was promised.
6. **B6.** A timeline entry "Order created" is recorded, stating what happened, when, who ordered, and the next step ("pay to secure this order — unpaid orders expire after 24 hours").
7. **B7.** The buyer lands on the order page showing status `Awaiting payment`, the listing snapshot, the timeline, the expiry time, and the available actions: pay ([UC-004](UC-004-buyer-pays-into-escrow.md)) and cancel.

## Alternate / Error Flows

### A1: Buyer cancels the unpaid order

- Condition: the order is `Awaiting payment` and the buyer chooses to cancel.
- Steps: the order moves to `Cancelled`; its reserved unit returns to the listing's available stock; a timeline entry "Order cancelled" records who cancelled and that the reservation was released.
- Outcome: a cancelled order cannot be paid or reactivated later; the buyer may place a new order.

### A2: Unpaid order expires

- Condition: an order stays `Awaiting payment` for 24 hours.
- Steps: the order moves to `Cancelled` (reason: expired), the unit returns to available stock, and a timeline entry records the expiry. An order with a payment in progress is skipped until its payment hold lapses (UC-004).
- Outcome: same end state as A1. The expiry time is included in the order API response.

### A3: Last unit reserved while buyer was viewing

- Condition: at B4 the listing has no unreserved units (concurrent orders) or quantity was exhausted.
- Steps: the order is not created; the buyer is told the listing is currently unavailable and can retry later (a reservation may expire).
- Outcome: no reservation leaks; stock never goes negative, including under concurrent order attempts.

### A4: Listing no longer active

- Condition: at B4 the listing was archived (or unpublished) after the buyer opened the page.
- Steps: the order is not created; the buyer sees that the listing is no longer available.
- Outcome: no order or reservation exists.

### A5: Seller archives a listing with stock

- Condition: a seller archives an `Active` listing.
- Steps: the listing stops accepting new orders and disappears from buyer browse/search; existing orders (including unpaid ones) are unaffected and keep their snapshot and reservation.
- Outcome: archived listings remain visible to the seller (and operators).

### E1: Publish with missing required fields

- Condition: at S3 one or more required fields are absent or invalid (e.g. quantity 0, price ≤ 0).
- Steps: publishing is rejected with field-level reasons; the listing stays `Draft`.
- Outcome: buyers never see an incomplete listing.

### E2: Unauthorized actions

- Condition: a user without listing permission tries to create/publish/archive a listing for an organization, or a user tries to cancel an order they don't own, or a signed-out user tries to order.
- Steps: the action is rejected with an authorization error (sign-in prompt for the signed-out buyer).
- Outcome: no state change.

## Postconditions

- An order exists in `Awaiting payment`, owned by the buyer, bound to the listing and seller organization, holding an immutable listing snapshot and an expiry timestamp.
- The listing's available stock reflects all active reservations and sales; available + reserved + sold always equals the published quantity, and no counter goes negative.
- The order timeline contains at least "Order created" (and "Order cancelled" where applicable), each answering: what happened, when, who, what next.

## Data / Validations

### Listing — required fields to publish

| Field                    | Notes                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| Title                    |                                                                                                |
| Description              |                                                                                                |
| Brand and model          | e.g. "Lenovo ThinkPad T14 Gen 3"                                                               |
| CPU                      |                                                                                                |
| RAM                      |                                                                                                |
| Storage                  | type and capacity                                                                              |
| Screen size              |                                                                                                |
| Condition grade          | A/B/C with a plain-language definition shown to buyers                                         |
| Condition guarantees     | structured floors/ranges, e.g. battery health ≥ 90%, battery cycles 100–300 (shape may evolve) |
| Known defects            | free text; "none" is an explicit valid value                                                   |
| Price                    | SEK only, integer minor units (öre); > 0                                                       |
| Available quantity       | integer ≥ 1 at publish                                                                         |
| Fulfillment expectations | what the seller will do and roughly when                                                       |

Optional for MVP: operating system, GPU, ports, included accessories, warranty notes. Photos deferred.

### Rules

- Orders only from `Active` listings with available stock; reservation and order creation are atomic (no oversell under concurrency).
- Order quantity is fixed at 1; the API does not accept a quantity input.
- All amounts are SEK minor units; the API rejects any other currency.
- Order snapshot is immutable after creation.
- State transitions in this slice: order `Awaiting payment → Cancelled` (buyer cancel or 24h expiry); listing `Draft → Active → Archived` (archive allowed from Active; re-publish of archived listings is out of scope for this slice). `Awaiting payment → Paid into escrow` is UC-004.
- A cancelled order can never be paid; a payment that succeeds for a cancelled order is returned to the buyer (UC-004 A4).

### Outputs

- Order detail (status, snapshot, expiry, timeline, available actions).
- Listing detail (disclosures, availability).
- Browse/search results of active listings.

## Observability

- Logs: listing published/archived; order created/cancelled (with actor, listing, order IDs).
- Metrics (measurement signal for the slice): listings published, orders created, orders cancelled/expired, order-creation conflicts (A3).
- Audit: order creation and cancellation are attributable to a user and timestamped (the timeline doubles as the user-visible audit trail).

## Security / Compliance

- Auth: ordering and all seller actions require a signed-in user; browsing active listings does not.
- Authorization: listing create/publish/archive require membership in the owning organization with listing permission; order cancel requires order ownership (operators excluded from this slice's UI, but data must be inspectable later).
- Audit: see Observability.

## Non-Goals (this use case)

- Payment and escrow ([UC-004](UC-004-buyer-pays-into-escrow.md)); fulfillment, confirmation, release (UC-005).
- Offers/negotiation, multi-item cart, quantities > 1 per order, currencies other than SEK.
- Photos/media, reviews, ratings, recommendations, saved listings.
- Operator inspection UI, refunds, disputes, notifications.

## Success Metric

A buyer can go from browse → listing detail → order page showing `Awaiting payment` with a timeline and next step, demoed locally through the web UI; concurrent order attempts on the last unit never oversell.

## Mapping to Architecture

- Commands: `Listings.CreateListingDraft`, `Listings.UpdateListingDraft`, `Listings.PublishListing`, `Listings.ArchiveListing`, `Orders.CreateOrder`, `Orders.CancelUnpaidOrder`
- Queries: `Catalog.BrowseActiveListings`, `Catalog.GetListingDetail`, `Orders.GetOrderDetail`
- Domain events: `ListingPublished`, `ListingArchived`, `OrderCreated`, `OrderCancelled`
- Integration events: none required for this slice (single visible surface; add to `EVENT_CATALOG.md` only if a cross-module consumer appears)
- Persistence: listings (with stock counts), orders (with snapshot + expiry), order timeline entries

The implemented backend uses `listings` and `orders` modules; listing discovery is served by `listings`. The mapping above describes capabilities, not exact class names. Cross-module transaction ownership remains open under ADR-007 and is the next backend reliability task.
