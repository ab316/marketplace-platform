# UC-014: Buyer Reviews Their Orders

Owner: product (ordering)
Status: Implemented
Surfaces: API ✓ · Web — (browser ordering pending; design contract [`docs/design/buyer-ordering.md`](../../design/buyer-ordering.md))
Last updated: 2026-11-12

Part of the [buyer ordering spec](../feature-specs/buyer-ordering.md) (decisions D6, D7). It settles how a buyer finds an order again and reads where it stands — the page every later buyer action hangs off, from paying ([UC-004](UC-004-buyer-pays-into-escrow.md)) to confirming completion (Phase 5).

**Approved 2026-11-12.** The four open questions this document was holding — paging, whether the timeline is the page, who owns the "next step" wording, and whether the buyer sees the fee — were settled by the founder and are recorded under [Decisions](#decisions). The design contract is [`docs/design/buyer-ordering.md`](../../design/buyer-ordering.md), with mockups at `/mocks/orders`. Grouping orders by what needs action is deliberately not here: that is the buyer dashboard, **P0-014** in Phase 5.

Implemented on the API: order responses name the selling organization through an identity-backed directory port (P1-020). The browser list and detail pages remain pending in the next ordering PR; the payment action remains a later UC-004 slice.

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

1. **O1.** The buyer opens their orders and sees their own orders only, newest first, **12 per page** with paging controls, each with what was ordered, its status in plain language, and the amount (D9).
2. **O2.** The buyer opens one order.
3. **O3.** The order page shows the status, what was promised at the time of ordering (the immutable snapshot, not the listing as it is now), the amount, the selling organization's name, and — while the order is unpaid — when the reservation expires.
4. **O4.** It shows the timeline as **one section of the page**, not as the page itself: every entry so far, each saying what happened, when, and who did it (D10; [P0-012](../product-backlog.md), [idea 001](../ideas/001-trust-centered-order-timeline.md)).
5. **O5.** It states the next step in words — **one forward-looking line owned by the product, derived from the order's current state** (D11) — and offers the actions the buyer can take right now: cancelling an unpaid order ([UC-013](UC-013-buyer-cancels-unpaid-order.md)) and, from UC-004's slice, paying.

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
- Steps: the page shows that the money is held in escrow and that the next step belongs to the seller. The marketplace fee is never shown: it is seller-borne and not part of what the buyer paid (D12). Fulfillment actions do not exist yet (Phase 5).
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

- Inputs: the signed-in buyer; an order identifier for the detail view; a page offset for the list.
- Rules: a buyer sees only their own orders; the order page shows the snapshot, never the current listing; amounts are SEK and never shown in öre; the list pages at 12 and is ordered newest first with a deterministic tiebreak; **no buyer-facing surface shows the marketplace fee or the frozen fee rate** (D12).
- Outputs: the buyer's orders with status and amount; one order with its snapshot, timeline, expiry, payment state, and next step.

## Observability

- Metrics: orders opened, and unpaid orders that expire without the buyer opening them once — the signal that the product needs notifications (P1-007).

## Security / Compliance

- Auth: signed in.
- Authorization: own orders only (E1).

## Decisions

Settled by the founder on 2026-11-12 and recorded in the [buyer ordering spec](../feature-specs/buyer-ordering.md#decisions) as D9–D12:

- **D9 — The list pages at 12 from the first version.** Twelve matches the catalogue's page size, so the buyer meets one paging idiom across the product. Paging is built now rather than retrofitted: the API already pages, and a list that silently truncates is worse than one that says there is more.
- **D10 — The timeline is one section of the order page.** Idea 001's "the timeline _is_ the order" is deliberately not taken yet; revisit when fulfillment entries make the timeline the longest thing on the page.
- **D11 — The product owns the page's next-step line; the API owns each entry's.** The page states one forward-looking line derived from the order's current status and payment state, worded in the web app alongside the rest of the page copy. The `nextStep` the API returns per timeline entry stays inside that entry, as part of how it narrates what happened. The order's next step is a property of its current state, not of its last event — they coincide today but diverge as soon as the seller has steps of their own, and a buyer-facing wording change should not be a backend deploy. The risk is the two wordings drifting; the page's line is therefore the only forward-looking statement on the page, and timeline entries read as history.
- **D12 — The buyer never sees the marketplace fee.** It is seller-borne ([PD-0004](../decisions/0004-escrow-fee-and-payment-policy.md)) and not part of what the buyer pays, so showing it would raise a question the buyer does not need to answer. This covers the fee amount and the frozen fee rate, on the order page and everywhere else buyer-facing.

## Mapping to Architecture

- Queries: `Orders.ListBuyerOrders`, `Orders.GetOrderDetail`, both naming the seller through a directory port backed by the identity module (P1-020).
- Commands, events: none.
- Persistence: `orders`, order timeline entries.
