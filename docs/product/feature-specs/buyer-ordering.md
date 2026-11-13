# Feature Spec: Buyer Ordering

## Status

**Approved — 2026-11-07.** Shaped for the Phase 6 deliverable "Buyer order placement, cancellation, and the buyer's orders" ([roadmap](../roadmap.md)). Decisions D2, D3, and D5–D8 were settled by the founder on 2026-11-07 (see [Decisions](#decisions)).

**Narrowed on 2026-11-07:** inspecting a listing was shaped here and moved to its own spec, [`buyer-discovery.md`](buyer-discovery.md) ([UC-012](../use-cases/UC-012-buyer-views-listing-details.md), with D1 and D4), because discovery is an area that keeps growing while ordering is one commitment step. Decisions keep the numbers they were settled with, so existing references stay valid.

**Shipped 2026-11-12** on API and web, the same day D9–D12 closed the order-page questions. Its use cases:

- [UC-001](../use-cases/UC-001-buyer-places-an-order.md) — places an order. Implemented on the API since Phase 1; the web surface is this slice.
- [UC-013](../use-cases/UC-013-buyer-cancels-unpaid-order.md) — cancels an unpaid order. Implemented on the API; outline depth.
- [UC-014](../use-cases/UC-014-buyer-reviews-their-orders.md) — reviews their orders. **Approved 2026-11-12** (D9–D12). The design contract is approved ([`docs/design/buyer-ordering.md`](../../design/buyer-ordering.md)): the confirmation is a dedicated page and the order page keeps the sticky status panel, chosen 2026-11-12 from the `/mocks/orders` gallery.

## Summary

Between finding a laptop and owning it sits one commitment: the buyer orders a single unit, which holds it for 24 hours while no money moves. This feature is that commitment and everything the buyer does with it before paying — confirm the order, see it as `Awaiting payment` with its expiry and timeline, cancel it, and find it again later.

The backend has done all of it since Phases 1–4: `POST /api/orders`, `POST /api/orders/:orderId/cancel`, `GET /api/orders/:orderId`, `GET /api/buyer/orders`. None of it is reachable in a browser.

## Problem

A buyer can inspect a listing ([discovery](buyer-discovery.md)) and still cannot buy it. The seller's half of the Phase 6 demo works end to end, so the product can publish listings nobody can order.

One gap in settled behavior surfaced while shaping: **anyone signed in can order anything**, including a member ordering their own organization's listing and a platform admin ordering as if they were a buyer. No rule covered this; [UC-003](../use-cases/UC-003-seller-organization-and-member-management.md) E7 only stops staff from selling. Settled as D3, tracked as P1-021.

## Target users

- **Buyer, signed in** — orders one unit, cancels it while unpaid, follows it afterwards.
- **Buyer, signed out** — meets the only sign-in wall in the buyer journey, at the order action.
- **Seller organization member** — indirectly: an order commits their stock for 24 hours.
- **Marketplace operator** — not a user of this feature; operator inspection is a later Phase 6 slice.

## Goals

- A buyer can commit to a purchase in the browser, deliberately, knowing no money has moved.
- An order explains itself: what was promised, what state it is in, when it expires, and what happens next.
- A buyer can get out of an unpaid order in one action, and the unit goes straight back on sale.
- A buyer can find an order again without a link.

## Non-goals

- **Payment.** The Pay action and the escrow flow are the next Phase 6 slice ([UC-004](../use-cases/UC-004-buyer-pays-into-escrow.md)). The order page describes the next step in words, with no payment affordance (D6).
- **A buyer order dashboard.** `/orders` is a plain list; grouping by what needs action is P0-014 (Phase 5), where fulfilled and completed orders exist to group (D7).
- **Inspecting the listing** — [`buyer-discovery.md`](buyer-discovery.md).
- **Quantities above one, carts, and offers** — MVP non-goals, unchanged (UC-001 scope decision 4; P2-001, P3-012).
- **Changing or re-ordering a cancelled order.** The buyer places a new one.
- **Notifications** of any kind (P1-007), including "your order is about to expire".
- **Seller and operator views of an order.** Both are later slices.

## User journey

```text
Buyer decides on a listing (discovery)
→ chooses to order; signs in if they have not
→ confirms what they are committing to — one unit, this price, no payment yet
→ lands on the order page: awaiting payment, held for 24 hours, what happens next
→ cancels it, or leaves it and comes back to it from their orders
```

## Main flow

1. The buyer chooses to order from the listing page. A signed-out buyer signs in first and returns to the same listing (D5).
2. The buyer confirms: one unit, this price, no payment taken yet, the unit held for 24 hours (D2).
3. The order is created in `Awaiting payment`, one unit is reserved, and the listing snapshot is captured ([UC-001](../use-cases/UC-001-buyer-places-an-order.md)).
4. The buyer lands on the order page: status, what they ordered, who from, the expiry, the timeline, and the next step ([UC-014](../use-cases/UC-014-buyer-reviews-their-orders.md), D6).
5. The buyer cancels the unpaid order, and the unit returns to stock ([UC-013](../use-cases/UC-013-buyer-cancels-unpaid-order.md)) — or leaves it, and finds it again in their orders.

## Edge cases

- **The last unit goes while the buyer was deciding.** Ordering is refused with "no longer available", and the buyer is offered the catalogue. No reservation leaks (UC-001 A3).
- **The listing was archived while the buyer was deciding.** Same refusal (UC-001 A4).
- **A member of the selling organization, or a platform admin, tries to order.** Refused, with the reason; the product does not offer the action in the first place (D3).
- **A buyer who is a member of a _different_ organization orders.** Allowed. Sellers buy from each other like anyone else (D3).
- **The buyer double-submits.** A second order must not come from one intent. The web guards the action, but this is a mitigation, not a guarantee: `Idempotency-Key` handling is deferred to the "Backend reliability" block (see [Product risks](#product-risks)).
- **The buyer orders the same listing twice deliberately.** Allowed today; each order holds its own unit (D8).
- **The buyer signs in to order and the listing has gone by the time they return.** They land on the listing in its unavailable state, not on an error.
- **The buyer cancels an order that already expired.** The product states the order is already cancelled; nothing changes and no unit is released twice (P1-013, unchanged).
- **The buyer cancels while a payment is in progress.** Refused until the payment resolves or its hold lapses (UC-013 A2).

## States and status changes

No new status. This feature is the buyer-facing surface of transitions that already exist.

| Current state                     | Action                  | New state          | Notes                                                                            |
| --------------------------------- | ----------------------- | ------------------ | -------------------------------------------------------------------------------- |
| Listing `Active`, units available | Buyer confirms an order | `Awaiting payment` | One unit moves from available to reserved; snapshot captured; expiry set to 24 h |
| Listing `Active`, no units free   | Buyer attempts to order | —                  | Refused; the listing page states it is currently unavailable                     |
| Listing `Archived`                | Buyer attempts to order | —                  | Refused; the listing page states it is no longer sold                            |
| Order `Awaiting payment`          | Buyer cancels           | `Cancelled`        | Reservation released; reason `buyer_cancelled` (UC-013)                          |
| Order `Awaiting payment`          | 24 hours pass unpaid    | `Cancelled`        | Reason `expired`; unchanged behavior (UC-001 A2)                                 |
| Order `Awaiting payment`          | Buyer pays              | `Paid into escrow` | The next slice (UC-004); this feature only describes it                          |
| Order `Cancelled`                 | Any buyer action        | —                  | Terminal. The buyer may place a new order                                        |

## Permissions

| Action                                   | Allowed users                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Place an order                           | Any signed-in user who is **not** a member of the selling organization and **not** a platform admin (D3) |
| Cancel an unpaid order                   | The buyer who placed it                                                                                  |
| View an order                            | Its buyer, members of the selling organization, and operators (unchanged)                                |
| View the list of the caller's own orders | The signed-in user, their own orders only                                                                |

## Timeline entries

No new entries. The buyer-facing surface renders the entries that already exist: `order_created`, `order_cancelled`, and the payment entries from UC-004. Each must read as plain language with its "what next" (P0-012, [idea 001](../ideas/001-trust-centered-order-timeline.md)).

## Notifications

None. Notification infrastructure is P1-007; an unpaid order expires silently, which is why the expiry time is prominent on the order page.

## Business rules

Recorded in [`business-rules-policies.md`](../business-rules-policies.md) under "order creation": who may place an order (D3), that an order is created only on the buyer's explicit confirmation and an intent from before sign-in is never replayed (D2, D5), and that a buyer may hold more than one unpaid order on a listing (D8). Everything else is unchanged: orders only from active listings with available stock, one unit per order, SEK only, 24-hour unpaid expiry, and an immutable snapshot.

## Acceptance criteria

Refined with the slice; the shape to hit:

- [x] An eligible signed-in buyer orders one unit after an explicit confirmation step that states the price and that no payment is taken yet.
- [x] A signed-out buyer is sent to sign in and returned to the listing; no order is ever placed on their behalf.
- [x] A member of the selling organization and a platform admin are told why they cannot order, and the API refuses them (P1-021).
- [x] Racing buyers never oversell: the loser is told the listing is unavailable and no reservation leaks.
- [x] The order page shows status, what was ordered, the seller, the expiry, the full timeline, and the next step — with no payment affordance until UC-004's slice.
- [x] The buyer can cancel an unpaid order after confirming, and the unit returns to stock.
- [x] `/orders` lists the buyer's own orders, newest first, 12 per page with paging controls, each with its status and a link to the order.
- [x] The order response names the selling organization (the rest of P1-020).

## Success metrics

- **Demo completeness:** the Phase 6 buyer journey — search → listing → order — runs in the browser against the real backend.
- **Orders placed**, and **failed order attempts** (refused as unavailable) as a share of attempts: a rising share means the catalogue is showing stale stock.
- **Unpaid orders that expire** rather than being paid or cancelled — the signal that the payment slice and notifications matter.

## Product risks

- **No `Idempotency-Key` on order creation.** A retried or double-submitted request can create a second order holding a second unit, which the buyer then has to cancel. Durable idempotency is in the "Backend reliability" block and gates release; the web-side guard (disable on submit, redirect on success) narrows the window but does not close it.
- **Reservation and order creation are still not atomic** (ADR-007, open). The failure is compensated, not prevented; putting a real buyer in front of it makes the gap visible sooner, which argues for the reliability block landing before any release.
- **A buyer can hold several units of one listing** with unpaid orders and starve other buyers for 24 hours (D8, P1-022). Acceptable while the marketplace has no real traffic.
- **An anonymous buyer builds the whole intent and only then meets a sign-in wall.** Measured by sign-ins arriving with a `next` pointing at a listing; if the drop-off is bad, move the prompt earlier.

## Decisions

Settled by the founder on 2026-11-07, together with the discovery decisions D1 and D4 ([`buyer-discovery.md`](buyer-discovery.md)); numbers are kept from that round.

- **D2 — Ordering has an explicit confirmation step.** The buyer reviews what they are committing to — the listing, one unit, the price, that no payment is taken yet, and that the unit is held for 24 hours — and confirms. One order is a 24-hour commitment of someone else's stock; a single stray click should not create it.
- **D3 — Sellers do not order from themselves, and staff do not order at all.** A member of the selling organization (any role) cannot order that organization's listing: there is no real purchase, and it would corrupt the marketplace's own order and fee data. A platform admin cannot place orders at all, mirroring UC-003 E7 ("staff never sell") — staff are not participants. A member of a _different_ organization orders like any other buyer. The web hides the action and explains why; the API enforces it. A **backend change**, recorded as a Phase 6 exception and tracked as **P1-021**.
- **D5 — Sign-in returns the buyer to the listing, and never orders for them.** The order action on a signed-out page goes to `/sign-in?next=/listings/<id>`, the mechanism the seller area already uses. After signing in the buyer is back on the listing and confirms the order themselves. An intent captured before sign-in is not a commitment, and replaying it would place an order the buyer never confirmed while signed in.
- **D6 — The order page is built in full now, without payment.** It renders status, the snapshot, the seller, the expiry, every timeline entry the API returns (including the paid and cancelled shapes), and the next step in words. No Pay button until UC-004's slice adds one. Building the page once avoids a throwaway version.
- **D7 — `/orders` is a plain list.** The buyer's orders, newest first, each with status, what it was, and a link. Grouping by what needs action stays with the buyer dashboard (P0-014, Phase 5).
- **D8 — Several unpaid orders by one buyer on one listing stay allowed.** Each order holds its own unit, so nothing oversells. A per-buyer limit is captured as **P1-022** and left unscheduled; the risk is recorded above.

Settled on 2026-11-12, closing what UC-014 was holding open:

- **D9 — The buyer's order list pages at 12 from the first version**, matching the catalogue's page size so the product has one paging idiom. Paging is built now, not retrofitted; the API already pages.
- **D10 — The timeline is one section of the order page**, not the page itself. Revisit when fulfillment entries arrive (idea 001).
- **D11 — The product owns the order page's next-step line; the API owns each timeline entry's.** The page derives one forward-looking line from the order's current status and payment state and words it in the web app; the per-entry `nextStep` stays inside the entry as narration of what happened. The next step is a property of the order's current state, not of its last event, and buyer-facing wording should not need a backend deploy. To stop the two drifting, the page's line is the only forward-looking statement on the page.
- **D12 — The buyer never sees the marketplace fee**, amount or rate, anywhere buyer-facing. It is seller-borne (PD-0004) and not part of what the buyer pays.

## Open questions

None. D1–D12 settle the spec, and the design contract is approved ([`docs/design/buyer-ordering.md`](../../design/buyer-ordering.md)) with both layout directions chosen from the mockups on 2026-11-12.

## Follow-up ideas

- **Show the time left on the hold as a countdown** rather than an absolute expiry time, once orders have real traffic.
- **Order again** from a cancelled or expired order, as one action back into the same listing.
