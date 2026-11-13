# UC-013: Buyer Cancels an Unpaid Order

Owner: product (ordering)
Status: Implemented
Surfaces: API ✓ · Web ✓ (shipped 2026-11-12; design contract [`docs/design/buyer-ordering.md`](../../design/buyer-ordering.md))
Last updated: 2026-11-12

Part of the [buyer ordering spec](../feature-specs/buyer-ordering.md). This behavior was settled and built as [UC-001](UC-001-buyer-places-an-order.md) A1 in Phase 1; it moved here on 2026-11-07 because it is its own goal with its own trigger, and its web surface ships separately from order placement.

The behavior is unchanged from how Phase 1 built it; this document records it where it belongs. The web surface — the confirmed cancel action on the order page — shipped 2026-11-12 with the ordering slice.

## Goal

A buyer releases an order they no longer want, before any money is involved.

## Primary Actor

- Buyer who placed the order

## Stakeholders

- **Buyer** — wants out of a commitment they have not paid for, without consequences.
- **Seller organization** — wants the unit back on sale as soon as the buyer is gone.
- **Marketplace operator** — wants the cancellation attributable and visible in the timeline.

## Preconditions

- The order is `Awaiting payment` and belongs to the buyer.
- No payment is in progress: a payment hold blocks cancellation until it resolves or times out ([UC-004](UC-004-buyer-pays-into-escrow.md), [PD-0004](../decisions/0004-escrow-fee-and-payment-policy.md)).

## Trigger

The buyer chooses to cancel the order from the order page.

## Main Flow

1. **C1.** The buyer asks to cancel, and confirms — cancelling is final and the unit goes back on sale.
2. **C2.** The order moves to `Cancelled` with the reason "cancelled by the buyer".
3. **C3.** The reserved unit returns to the listing's available stock.
4. **C4.** A timeline entry records who cancelled, when, and that the reservation was released.
5. **C5.** The buyer sees the cancelled order, with no remaining actions and the option to find the listing again.

## Alternate / Error Flows

### A1: The order expired first

- Condition: the 24-hour unpaid window elapsed before the buyer cancelled (UC-001 A2).
- Steps: the product states the order is already cancelled, with the expiry as its reason. Nothing changes and no unit is released twice.
- Outcome: the same end state, reached by the sweep rather than the buyer.

### A2: A payment is in progress

- Condition: the buyer started a payment and its hold is still active.
- Steps: cancellation is refused while the payment resolves; the buyer is told to wait for the outcome.
- Outcome: money and order state cannot diverge. If the payment fails or times out, the order is cancellable again.

### E1: The order is not cancellable

- Condition: the order is already cancelled (repeated cancellation, P1-013) or already paid.
- Steps: the action is refused with the reason; a paid order needs the recovery workflows (P1-002/P1-003), which do not exist yet.
- Outcome: no state change, no duplicate timeline entry, no second stock release.

### E2: Someone else tries to cancel

- Condition: a user who is not the buyer — including a member of the selling organization or a platform admin — attempts the cancellation.
- Steps: refused.
- Outcome: no state change. Operator-initiated cancellation is not part of the MVP.

## Postconditions

- The order is `Cancelled`, permanently: it can never be paid or reactivated.
- The listing's stock is restored, and the counters still satisfy available + reserved + sold = published quantity.
- The timeline holds a "cancelled" entry naming the actor.

## Data / Validations

- Inputs: the order identifier; the actor must be the buyer.
- Rules: only an `Awaiting payment` order with no active payment hold cancels; the stock release and the status change belong to the same logical change (atomicity is open under the roadmap's "Backend reliability" block); cancellation is irreversible.
- Outputs: the cancelled order with its timeline.

## Observability

- Logs: cancellation with actor, order, and listing ids.
- Metrics: buyer cancellations, split from expiries — a high rate means either the listings or the ordering step is misleading.
- Audit: the timeline entry is the user-visible audit record.

## Security / Compliance

- Auth: signed in.
- Authorization: order ownership (E2).

## Mapping to Architecture

- Commands: `Orders.CancelUnpaidOrder` (exists), releasing the unit through the listings module.
- Domain events: `OrderCancelled`.
- Persistence: `orders`, order timeline entries, `listings` stock counters.
