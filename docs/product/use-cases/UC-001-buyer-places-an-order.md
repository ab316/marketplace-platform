# UC-001: Buyer Places an Order

Owner: product (ordering)
Status: Implemented
Surfaces: API ✓ · Web — (order placement is a Phase 6 slice; design contract [`docs/design/buyer-ordering.md`](../../design/buyer-ordering.md))
Last updated: 2026-11-12

The buyer's commitment: one unit of an active listing is held for them in `Awaiting payment`, at a price that can no longer change, with no money moving. Payment, escrow, and fulfillment are later slices.

Originally the first stable use case for Phase 0/1 ([roadmap](../roadmap.md), [PD-0002](../decisions/0002-refurbished-computers.md), discovery "Slice A"), where it covered the whole thin visible journey from publishing a listing to reading the order page. Three amendments have since given each of those goals its own use case; the history is below because other documents still reference this one's step labels.

**Amended 2026-11-07:** the seller's side, steps S1–S4, error flow E1, and the seller parts of A5 and E2, moved into its own use cases under the [seller listing management spec](../feature-specs/seller-listing-management.md): [UC-005](UC-005-seller-creates-listing-draft.md) create a draft, [UC-007](UC-007-seller-edits-listing-draft.md) edit it, [UC-008](UC-008-seller-publishes-listing.md) publish, [UC-009](UC-009-seller-archives-listing.md) archive, and [UC-010](UC-010-member-reviews-organization-listings.md) review the organization's listings. The listing required fields moved to the [business rules](../business-rules-policies.md#required-listing-fields). This use case keeps only the buyer's journey; step and flow labels are kept so existing references stay valid.

**Amended again 2026-11-07**, shaping the buyer's web slices ([buyer ordering spec](../feature-specs/buyer-ordering.md), with inspecting a listing in [buyer discovery](../feature-specs/buyer-discovery.md)). The buyer's journey is likewise split by goal, and this use case keeps only **placing the order**:

- reading the listing (B2) is [UC-012](UC-012-buyer-views-listing-details.md), where [UC-006](UC-006-buyer-searches-the-catalogue.md) B8 now lands;
- cancelling the unpaid order (A1) is [UC-013](UC-013-buyer-cancels-unpaid-order.md);
- coming back to the order page and the buyer's order list (the reading half of B7) is [UC-014](UC-014-buyer-reviews-their-orders.md).

Two rules were added here: ordering requires an explicit confirmation step (spec D2), and **a member of the selling organization or a platform admin cannot order** (spec D3; enforced since 2026-11-12, P1-021).

**Amended 2026-11-12:** this document is now written as what it has been since the splits — placing the order, and nothing else. The title, goal, success metric, and outputs were narrowed to the commitment; finding and reading the listing (B1, B2) became preconditions; and the scope decisions that govern what a listing _is_ were replaced with pointers to where they now live. No behavior changed, and step and flow labels are kept so existing references stay valid.

## Goal

A buyer commits to a laptop they have already chosen: one unit is held for them at a fixed price, with no money moving yet.

## Primary Actor

- Buyer (primary demo user)

Supporting actor: seller organization member, who published the listing beforehand ([UC-008](UC-008-seller-publishes-listing.md)).

## Stakeholders

- **Buyer** — wants to commit deliberately, knowing exactly what was promised and that no money has moved yet.
- **Seller organization** — wants committed orders, and its stock held only for as long as an order is alive.
- **Marketplace operator** — wants order creation to be auditable (full inspection UI is a later slice).

## Scope decisions (settled for this use case)

These resolve the open questions from PD-0002 and discovery:

1. **Assortment:** refurbished **laptops only** for the first demo — a marketplace-wide decision ([PD-0002](../decisions/0002-refurbished-computers.md)), not this use case's to make.
2. **Inventory model:** a listing is **pooled stock** of identically specified units under one condition guarantee. Settled with the listing, not the order ([UC-008](UC-008-seller-publishes-listing.md)); an order claims one unit from that pool.
3. **Required disclosures:** the [required listing fields](../business-rules-policies.md#required-listing-fields), enforced at publishing ([UC-008](UC-008-seller-publishes-listing.md)). What the buyer reads before deciding is [UC-012](UC-012-buyer-views-listing-details.md).
4. **Purchase mechanics:** **immediate order** from an active listing, **one unit per order**. No availability request, quote, offer flow, or multi-unit quantity (offers and carts deferred per MVP scope). May be revisited later.
5. **Reservation:** creating an order **reserves one unit** of the listing's stock. An unpaid order releases its unit when the buyer cancels it or when it **expires after 24 hours** unpaid. An automated expiry sweep is implemented; atomic cancellation and stock release remain pending backend reliability work. A payment in progress places a short hold that the sweep respects, and a successful payment converts the reserved unit to sold ([UC-004](UC-004-buyer-pays-into-escrow.md), [PD-0004](../decisions/0004-escrow-fee-and-payment-policy.md)).
6. **Currency: SEK only.** Prices are stored and returned as integer minor units (öre) with currency `SEK`. Multi-currency stays an MVP non-goal.

## Preconditions

- An `Active` listing exists with at least one unreserved unit, published by a seller organization member ([UC-008](UC-008-seller-publishes-listing.md)).
- The buyer has found that listing in the catalogue ([UC-006](UC-006-buyer-searches-the-catalogue.md)) and read its disclosures on the listing page ([UC-012](UC-012-buyer-views-listing-details.md)) — the former steps B1 and B2.
- The buyer is signed in. (Anonymous browsing of active listings is allowed; ordering requires sign-in.)
- The buyer is neither a member of the selling organization nor a platform admin (spec D3, P1-021): the API refuses such an attempt before anything is reserved, and the product does not offer the action.

## Trigger

A buyer viewing an active listing's detail page chooses to order it.

## Main Flow

Supporting flow — seller publishes (S1–S4): moved to [UC-005](UC-005-seller-creates-listing-draft.md) (S1), [UC-007](UC-007-seller-edits-listing-draft.md) (S2), and [UC-008](UC-008-seller-publishes-listing.md) (S3–S4).

Primary flow — buyer orders (B1–B7):

1. **B1–B2.** Finding the listing ([UC-006](UC-006-buyer-searches-the-catalogue.md)) and reading it ([UC-012](UC-012-buyer-views-listing-details.md)) happen before this use case begins; see [Preconditions](#preconditions). Search results and the listing page are a point-in-time view, never a reservation — which is why B4 re-checks availability.
2. **B3.** The buyer places an order (quantity 1 — single-item orders only in MVP) and **confirms it**: one unit, this price, no payment taken yet, and the unit held for 24 hours (spec D2). A signed-out buyer signs in first and returns to the listing; no order is ever placed on their behalf (spec D5).
3. **B4.** The system verifies the listing is still `Active` with at least one unreserved unit, then atomically reserves one unit and creates the order in `Awaiting payment`.
4. **B5.** The order captures a snapshot of the listing's buyer-relevant content (title, specs, condition guarantees, known defects, price, fulfillment expectations) so later listing edits cannot change what the buyer was promised.
5. **B6.** A timeline entry "Order created" is recorded, stating what happened, when, who ordered, and the next step ("pay to secure this order — unpaid orders expire after 24 hours").
6. **B7.** The buyer lands on the order page showing status `Awaiting payment`, the listing snapshot, the timeline, the expiry time, and the available actions: pay ([UC-004](UC-004-buyer-pays-into-escrow.md)) and cancel ([UC-013](UC-013-buyer-cancels-unpaid-order.md)). What that page shows, and how the buyer finds it again later, is [UC-014](UC-014-buyer-reviews-their-orders.md).

## Alternate / Error Flows

### A1: Buyer cancels the unpaid order

Moved to [UC-013](UC-013-buyer-cancels-unpaid-order.md). Unchanged: the order moves to `Cancelled`, its reserved unit returns to available stock, and a cancelled order can never be paid or reactivated.

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

### A5: Listing archived while orders are open

- Condition: the seller archives the listing ([UC-009](UC-009-seller-archives-listing.md)) while orders against it exist.
- Steps: the listing stops accepting new orders and disappears from buyer browse/search (catalogue visibility rules in [UC-006](UC-006-buyer-searches-the-catalogue.md)); existing orders (including unpaid ones) are unaffected and keep their snapshot and reservation.
- Outcome: archived listings remain visible to the seller (and operators).

### E1: Publish with missing required fields

Moved to [UC-008](UC-008-seller-publishes-listing.md) E1.

### E2: Unauthorized actions

- Condition: a signed-out user tries to order; a member of the selling organization tries to order their own organization's listing; a platform admin tries to order at all (spec D3). Cancellation authorization is [UC-013](UC-013-buyer-cancels-unpaid-order.md) E2. (Listing authorization is settled by the seller listing use cases, UC-005 and UC-007–UC-010.)
- Steps: the action is rejected with an authorization error (sign-in prompt for the signed-out buyer). The product does not offer the action in the first place when it knows the viewer cannot take it ([UC-012](UC-012-buyer-views-listing-details.md) A4).
- Outcome: no state change.

## Postconditions

- An order exists in `Awaiting payment`, owned by the buyer, bound to the listing and seller organization, holding an immutable listing snapshot and an expiry timestamp.
- The listing's available stock reflects all active reservations and sales; available + reserved + sold always equals the published quantity, and no counter goes negative.
- The order timeline contains at least "Order created" (and "Order cancelled" where applicable), each answering: what happened, when, who, what next.

## Data / Validations

### Listing — required fields to publish

Moved to the [business rules](../business-rules-policies.md#required-listing-fields), enforced by [UC-008](UC-008-seller-publishes-listing.md).

### Rules

- Orders only from `Active` listings with available stock; reservation and order creation are atomic (no oversell under concurrency).
- **Who may order:** any signed-in user except a member of the selling organization (any role) and a platform admin (spec D3). A member of a different organization orders like any other buyer. Enforced at order creation (P1-021, 2026-11-12): the refusal reserves nothing.
- An order is placed only after the buyer confirms it; an intent expressed before signing in is never replayed as an order (spec D2, D5).
- A buyer may hold several unpaid orders on the same listing; each holds its own unit (spec D8, [P1-022](../product-backlog.md)).
- Order quantity is fixed at 1; the API does not accept a quantity input.
- All amounts are SEK minor units; the API rejects any other currency.
- Order snapshot is immutable after creation.
- State transitions in this slice: order `Awaiting payment → Cancelled` (buyer cancel or 24h expiry); listing statuses are settled by the [seller listing management spec](../feature-specs/seller-listing-management.md). `Awaiting payment → Paid into escrow` is UC-004.
- A cancelled order can never be paid; a payment that succeeds for a cancelled order is returned to the buyer (UC-004 A4).

### Outputs

- The created order: status, snapshot, expiry, and its first timeline entry. What the order page then shows, and how the buyer finds it again, is [UC-014](UC-014-buyer-reviews-their-orders.md).

## Observability

- Logs: order created/cancelled (with actor, listing, order IDs). Listing logs belong to the seller listing use cases.
- Metrics (measurement signal for the slice): orders created, orders cancelled/expired, order-creation conflicts (A3).
- Audit: order creation and cancellation are attributable to a user and timestamped (the timeline doubles as the user-visible audit trail).

## Security / Compliance

- Auth: ordering requires a signed-in user; browsing active listings does not.
- Authorization: placing an order is refused to members of the selling organization and to platform admins (E2, spec D3, P1-021 — enforced in the domain and checked before anything is reserved). Order cancel requires order ownership (UC-013). Operators are excluded from this slice's UI, but the data must be inspectable later.
- Audit: see Observability.

## Non-Goals (this use case)

- Inspecting the listing ([UC-012](UC-012-buyer-views-listing-details.md)), cancelling the order ([UC-013](UC-013-buyer-cancels-unpaid-order.md)), and the order page's content and the buyer's order list ([UC-014](UC-014-buyer-reviews-their-orders.md)).
- Payment and escrow ([UC-004](UC-004-buyer-pays-into-escrow.md)); fulfillment, confirmation, release (Phase 5).
- Offers/negotiation, multi-item cart, quantities > 1 per order, currencies other than SEK.
- Photos/media, reviews, ratings, recommendations, saved listings.
- Operator inspection UI, refunds, disputes, notifications.

## Success Metric

A buyer confirms an order from a listing page and lands on their order in `Awaiting payment` with one unit held, demoed locally through the web UI; concurrent order attempts on the last unit never oversell.

## Mapping to Architecture

- Commands: `Orders.CreateOrder`, reserving the unit through the listings module (cancellation is [UC-013](UC-013-buyer-cancels-unpaid-order.md); listing commands belong to the seller listing use cases)
- Queries: none — the command returns the created order; reading it again is [UC-014](UC-014-buyer-reviews-their-orders.md)
- Domain events: `OrderCreated`
- Integration events: none required for this slice (single visible surface; add to `EVENT_CATALOG.md` only if a cross-module consumer appears)
- Persistence: listings (with stock counts), orders (with snapshot + expiry), order timeline entries

The implemented backend uses `listings` and `orders` modules; listing discovery is served by `listings`. The mapping above describes capabilities, not exact class names. Cross-module transaction ownership remains open under ADR-007 and is the next backend reliability task.
