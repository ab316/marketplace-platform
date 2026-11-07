# UC-014: Buyer Reviews Their Orders

Owner: product (ordering)
Status: Draft
Surfaces: — · — (the Phase 6 "ordering and orders" slice)
Last updated: 2026-11-07

Part of the [buyer ordering spec](../feature-specs/buyer-ordering.md) (decisions D6, D7). It settles how a buyer finds an order again and reads where it stands — the page every later buyer action hangs off, from paying ([UC-004](UC-004-buyer-pays-into-escrow.md)) to confirming completion (Phase 5).

**Outline depth — not ready to build.** The buyer's order list and order detail exist on the API (`GET /api/buyer/orders`, `GET /api/orders/:orderId`), but what the buyer-facing page shows in each state is only sketched here. Refine this to build depth before its slice starts, and settle the open questions below. Grouping orders by what needs action is deliberately not here: that is the buyer dashboard, **P0-014** in Phase 5.

## Goal

A buyer finds an order they placed and understands its current state, what it was for, and what happens next.

## Primary Actor

- Buyer who placed the order

## Stakeholders

- **Buyer** — wants to know where an order stands and what they must do, without asking anyone.
- **Seller organization** — wants the buyer informed, so fewer orders stall at the buyer's step.
- **Marketplace operator** — wants the buyer's view and the operator's view to come from the same record.

## Preconditions

- The buyer is signed in and has placed at least one order.

## Trigger

The buyer opens their orders, or follows a link to one order — from placing it, from a bookmark, or from a later notification (P1-007).

## Main Flow

1. **O1.** The buyer opens their orders and sees their own orders only, newest first, each with what was ordered, its status in plain language, and the amount.
2. **O2.** The buyer opens one order.
3. **O3.** The order page shows the status, what was promised at the time of ordering (the immutable snapshot, not the listing as it is now), the amount, the selling organization's name, and — while the order is unpaid — when the reservation expires.
4. **O4.** It shows the timeline: every entry so far, each saying what happened, when, and who did it ([P0-012](../product-backlog.md), [idea 001](../ideas/001-trust-centered-order-timeline.md)).
5. **O5.** It states the next step in words, and offers the actions the buyer can take right now — cancelling an unpaid order ([UC-013](UC-013-buyer-cancels-unpaid-order.md)) and, from UC-004's slice, paying.

## Alternate / Error Flows

### A1: The buyer has no orders

- Condition: the list is empty.
- Steps: the product says so and points at the catalogue.
- Outcome: a new buyer gets a route forward, not a blank page.

### A2: The order is cancelled or expired

- Condition: the order ended without payment.
- Steps: the page shows the terminal status with its reason and the complete timeline; no actions remain, and the buyer is offered the listing again.
- Outcome: a dead order explains itself.

### A3: The order is paid

- Condition: the order is `Paid into escrow`.
- Steps: the page shows that the money is held in escrow, the frozen fee is not the buyer's concern, and the next step belongs to the seller. Fulfillment actions do not exist yet (Phase 5).
- Outcome: the buyer knows the money is safe and whose turn it is.

### E1: Someone else's order

- Condition: a signed-in user opens an order they neither placed nor have a seller or operator relationship to.
- Steps: not available, in the same way an unknown order is.
- Outcome: no order enumeration.

### E2: The orders cannot be loaded

- Condition: the product cannot reach the order data.
- Steps: the buyer can retry; the failure is never shown as "no orders".

## Postconditions

- No state changes; this use case only reads.

## Data / Validations

- Inputs: the signed-in buyer; an order identifier for the detail view.
- Rules: a buyer sees only their own orders; the order page shows the snapshot, never the current listing; amounts are SEK and never shown in öre.
- Outputs: the buyer's orders with status and amount; one order with its snapshot, timeline, expiry, payment state, and next step.

## Observability

- Metrics: orders opened, and unpaid orders that expire without the buyer opening them once — the signal that the product needs notifications (P1-007).

## Security / Compliance

- Auth: signed in.
- Authorization: own orders only (E1).

## Open questions

- **Paging and volume.** The API pages; a buyer with three orders does not need pagination controls. Decide the page size and whether to page at all in the first version.
- **Is the timeline the whole page or a section of it?** Idea 001 argues the timeline _is_ the order. The first version can keep it as one section and revisit once fulfillment entries exist.
- **What "next step" text belongs to each status**, in the buyer's words, and whether it is the product or the timeline's last entry that owns that text (the API already returns a `nextStep` per entry).
- **Does the buyer see the marketplace fee?** PD-0004 makes it seller-borne; showing it may confuse more than it clarifies.

## Mapping to Architecture

- Queries: `Orders.ListBuyerOrders`, `Orders.GetOrderDetail` (both exist). Resolving the selling organization's name for the order response is part of P1-020.
- Commands, events: none.
- Persistence: `orders`, order timeline entries.
