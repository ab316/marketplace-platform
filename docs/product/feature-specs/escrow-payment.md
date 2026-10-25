# Feature Spec: Escrow Payment

## Status

Ready — roadmap Phase 4. Decided by [PD-0004](../decisions/0004-escrow-fee-and-payment-policy.md); behavior settled in [UC-004](../use-cases/UC-004-buyer-pays-into-escrow.md). Release and settlement follow in Phase 5.

## Summary

A buyer pays an `Awaiting payment` order and the money is held in escrow for that order until the buyer confirms delivery. The order becomes `Paid into escrow`, the seller learns that payment is secured, and everyone with access to the order can see where the money is. Payment runs through a simulated provider so the money model can be proven before a real provider is added.

## Problem

Today an order can only wait, be cancelled, or expire. Nothing moves money, so the product's central promise — the buyer's money is protected until the seller delivers — cannot be demonstrated, and no later step (fulfillment, release, settlement, operator inspection of financial state) has anything to build on.

## Target users

- Buyer — wants to pay once and know immediately whether the money is secured.
- Seller organization member — wants a clear "payment secured" signal before doing any work.
- Marketplace operator — wants every payment attempt and money movement auditable and balanced.

## Goals

- A buyer can pay an order and see the result at once.
- A successful payment holds exactly the order total in escrow for that order.
- Failure and provider silence leave the order recoverable and explained.
- A payment can never revive a cancelled or expired order; late money is returned.
- The platform fee rate is fixed for the order at payment time.
- The financial history for an order is complete, balanced, and never edited.

## Non-goals

- Real payment providers; multiple providers; split or partial payments; non-SEK currencies.
- Fee charging, release, and settlement (Phase 5).
- Refunds, disputes, seller cancellation of a paid order (post-MVP recovery).
- Notifications; any UI.

## User journey

```text
Buyer opens an Awaiting payment order
→ chooses Pay
→ sees "Payment in progress"
→ provider reports success
→ order shows Paid into escrow, "Payment secured", money held until delivery is confirmed
→ seller sees payment secured and the next step: start fulfillment
```

## Main flow

1. The buyer requests payment for the order.
2. The product checks the order is theirs, awaiting payment, not expired, and has no payment in progress.
3. The product starts a payment attempt, holds the order against expiry for 15 minutes, and asks the provider to collect the amount.
4. The provider reports success.
5. The product records the money as held in the order's escrow, moves the order to `Paid into escrow`, converts the reserved unit to sold, records the fee rate, and appends "Payment secured".
6. Buyer, seller, and operator see the new state; the seller's next action is to start fulfillment.

## Edge cases

- Payment fails: order stays awaiting payment, "Payment failed", buyer may retry.
- Provider never responds: attempt times out after 15 minutes, same outcome as failure.
- Same success reported twice: no second effect.
- Success arrives after the order was cancelled or expired: money returned, "Payment returned", order stays cancelled.
- Late success for a timed-out attempt on a live order: treated as success.
- Two payment requests at once: only one attempt is created.
- Order already paid, cancelled, or past its expiry time: payment rejected with the current state.

## States and status changes

| Current state    | Action                                       | New state        | Notes                                             |
| ---------------- | -------------------------------------------- | ---------------- | ------------------------------------------------- |
| Awaiting payment | Buyer starts payment                         | Awaiting payment | Payment status becomes "in progress"; 15-min hold |
| Awaiting payment | Provider reports success                     | Paid into escrow | Unit becomes sold; fee rate recorded              |
| Awaiting payment | Provider reports failure / attempt times out | Awaiting payment | Hold cleared; buyer may retry                     |
| Cancelled        | Provider reports success                     | Cancelled        | Money returned to buyer                           |
| Paid into escrow | Buyer cancels                                | —                | Not allowed in MVP                                |

## Permissions

| Action                            | Allowed users                                       |
| --------------------------------- | --------------------------------------------------- |
| Start payment                     | The order's buyer                                   |
| See payment status on the order   | Buyer, selling organization members, platform admin |
| See financial history of an order | Platform admin (buyer-facing summary via timeline)  |

## Timeline entries

| Event                    | User-visible text                                                                          | Actor  | Notes                         |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------ | ----------------------------- |
| Payment secured          | "Payment secured — your money is held safely until you confirm delivery."                  | Buyer  | Next step: seller fulfillment |
| Payment failed           | "Payment failed — try again before the order expires."                                     | Buyer  | Reason included               |
| Payment failed (timeout) | "Payment not completed — the provider did not respond. Try again."                         | System |                               |
| Payment returned         | "Payment returned — the reservation had already lapsed, so your money is on its way back." | System | Order stays cancelled         |

## Notifications

| Trigger         | Recipient | Message purpose                      |
| --------------- | --------- | ------------------------------------ |
| Payment secured | Seller    | Start fulfillment (deferred, P1-007) |
| Payment failed  | Buyer     | Retry (deferred, P1-007)             |

## Business rules

- Fee: 8% of the order total, seller-borne, computed on release, rate frozen at payment (PD-0004 §1).
- Payment hold 15 minutes; order expiry 24 hours from creation, never extended (PD-0004 §2).
- Payment never revives a cancelled or expired order; late money is returned (PD-0004 §3).
- A paid order's reserved unit becomes sold (PD-0004 §4).
- One payment attempt in progress per order.
- Every money movement is a balanced, append-only financial record.

## Acceptance criteria

- [ ] Buyer can start payment for an awaiting-payment order they own; anyone else is refused.
- [ ] Success moves the order to `Paid into escrow`, records "Payment secured", converts the unit to sold, and holds exactly the order total in the order's escrow.
- [ ] Failure keeps the order awaiting payment with its original expiry and records "Payment failed"; a retry is possible.
- [ ] An attempt unresolved after 15 minutes times out and the order becomes eligible for expiry again.
- [ ] The expiry sweep never cancels an order with a payment in progress.
- [ ] A duplicate success report has no second effect.
- [ ] A success for a cancelled or expired order returns the money, records "Payment returned", and leaves the order cancelled.
- [ ] Two simultaneous payment requests produce exactly one attempt.
- [ ] Seller and platform admin see payment status on the order; the admin sees attempts and financial history.
- [ ] Every financial entry balances, and the financial records cannot be edited or deleted.

## Success metrics

- Payment success rate; timeout and reversal counts (should be near zero outside simulated scenarios).
- Zero orders in `Paid into escrow` without a matching escrow balance, and vice versa.

## Product risks

- Without a shared transaction across order, stock, and ledger writes, a crash mid-success can leave money in escrow with the order still unpaid until the report is retried; engineering records this as an active risk ([ADR-009](../../decisions/ADR-009-payments-and-ledger-modules.md)).
- The scenario field is a demo/test affordance on the public API; it must be removed with the simulated provider.
- No self-serve path yet for an unfulfillable paid order.

## Follow-up ideas

- Minimum fee or tiered fee once settlement data exists.
- Automatic release after a confirmation window.
- Reconciliation view for operators: order state vs payment state vs ledger.
