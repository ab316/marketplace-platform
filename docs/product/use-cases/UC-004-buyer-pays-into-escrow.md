# UC-004: Buyer Pays an Order into Escrow

Owner: product (payments, ledger, orders)
Status: Implemented
Last updated: 2026-10-25

First slice of Phase 4 ([roadmap](../roadmap.md), [PD-0004](../decisions/0004-escrow-fee-and-payment-policy.md), [feature spec](../feature-specs/escrow-payment.md), backlog P0-007). A buyer with an order in `Awaiting payment` ([UC-001](UC-001-buyer-orders-refurbished-laptop.md)) pays it; on success the money is held in escrow for that order, the order shows `Paid into escrow`, the seller sees that payment is secured, and the financial history shows exactly where the money is. Payment runs through a simulated provider in this phase. Fulfillment, confirmation, and release are UC-005 (Phase 5).

## Goal

A buyer secures their order by paying into escrow and can see, at every step, whether their money is protected, still pending, or returned.

## Primary Actor

- Buyer (owner of the order)

Supporting actors: the payment provider (simulated), the seller organization (reads payment state), the marketplace operator (inspects payment state and financial history).

## Stakeholders

- **Buyer** — wants to pay once, know immediately whether it worked, and never lose money to an unclear state.
- **Seller organization** — wants to know when payment is secured so fulfillment can start, and to trust that funds are really held.
- **Marketplace operator** — wants every payment attempt and every money movement attributable, auditable, and balanced.

## Scope decisions (settled for this use case)

1. **Simulated provider.** No real payment provider. The payment request may carry a `scenario` (`success`, `failure`, `timeout`, `duplicate_success`) that tells the simulated provider which outcome to produce. The field is accepted only while the simulated provider is configured (PD-0004 §8).
2. **Amount.** The buyer pays exactly the order total in SEK; no partial payment, no surcharge.
3. **One attempt in progress at a time.** A new attempt can start only when no attempt for the order is pending.
4. **Payment hold.** Starting a payment holds the order against automatic expiry for 15 minutes; an attempt the provider has not resolved by then times out and the hold lapses (PD-0004 §2).
5. **Fee.** On success the platform fee rate in force (8%, PD-0004 §1) is recorded on the order's payment. Nothing is charged yet; the fee is taken at release (UC-005).
6. **Escrow accounting.** A successful payment is recorded as funds moving from the provider into an escrow account dedicated to this order. The order's financial history is the list of these movements.
7. **Cancelled is terminal.** A success arriving for a cancelled or expired order is returned to the buyer; the order is never revived (PD-0004 §3).
8. **Paid orders are not buyer-cancellable** in this phase; recovery flows (refund, dispute) are post-MVP.
9. **One read for everyone.** Payment status is part of the order detail that buyer, seller, and operator already read; there is no separate payment endpoint for the buyer. The itemized financial history is visible to platform administrators only (PD-0004 §8).

## Preconditions

- The buyer is signed in and owns an order in `Awaiting payment` whose 24-hour window has not elapsed.
- The simulated payment provider is configured.

## Trigger

The buyer, on the order page, chooses to pay.

## Main Flow

1. **P1.** The buyer requests payment for the order (optionally stating a scenario).
2. **P2.** The system verifies the caller is the order's buyer, the order is `Awaiting payment` and not past its expiry time, and no payment attempt is pending for it.
3. **P3.** The system creates a payment attempt in `Pending` for the order total, places a 15-minute payment hold on the order, and asks the provider to collect the amount. The buyer sees the order as `Awaiting payment` with payment status "Payment in progress".
4. **P4.** The provider processes the payment and reports the result back with a signed message carrying its own event identifier. (The simulated provider does this immediately after P3, according to the scenario.)
5. **P5.** On a success report the system, in this order: records the money as received from the provider and held in this order's escrow (financial history: "Payment captured into escrow"); moves the order to `Paid into escrow`, converting its reserved unit to sold and recording the fee rate; appends the timeline entry "Payment secured" with the next step ("the seller will start fulfillment"); and marks the attempt `Succeeded`.
6. **P6.** The buyer sees status `Paid into escrow`, payment status "Paid", and a plain-language explanation that the money is held until they confirm delivery. The seller sees the same order with "Payment secured" and the next action to start fulfillment. The operator sees the order, its payment attempts, and its financial history.

## Alternate / Error Flows

### A1: Payment fails

- Condition: at P4 the provider reports failure (scenario `failure`, or any provider decline).
- Steps: the attempt moves to `Failed` with the provider's reason; the payment hold is cleared; the order stays `Awaiting payment` with its original expiry; the timeline records "Payment failed" with the next step "try again before the order expires".
- Outcome: no money moved; the buyer may start a new attempt (P1) while the order is alive.

### A2: Provider never responds

- Condition: an attempt is still `Pending` 15 minutes after P3 (scenario `timeout`, or a real provider outage).
- Steps: the system marks the attempt `Timed out`; the hold lapses; the order stays `Awaiting payment`; the timeline records "Payment failed" (reason: no response from the provider) with the same next step as A1.
- Outcome: the order is again eligible for 24-hour expiry; the buyer may retry.

### A3: Duplicate success report

- Condition: the provider delivers the same success event twice (scenario `duplicate_success`, or a real redelivery).
- Steps: the second delivery is recognized by its event identifier; every effect of P5 is already in place, so nothing is posted, moved, or appended again.
- Outcome: exactly one escrow entry, one status change, one "Payment secured" entry.

### A4: Success arrives for a cancelled or expired order

- Condition: a success report arrives after the order was cancelled by the buyer (UC-001 A1) or expired (UC-001 A2) — for example after a timed-out attempt (A2) whose payment later went through.
- Steps: the money is recorded as received and immediately returned to the buyer (financial history: "Payment captured into escrow" followed by "Payment returned to buyer"); the attempt moves to `Reversed`; the order stays `Cancelled`; the timeline records "Payment returned" explaining that the reservation had already lapsed and the buyer may place a new order.
- Outcome: the order is never revived; the escrow for the order nets to zero; the buyer has their money back.

### A5: Late success for a timed-out attempt on a live order

- Condition: an attempt marked `Timed out` (A2) receives a success report while the order is still `Awaiting payment` and not expired.
- Steps: treated as P5; the attempt moves from `Timed out` to `Succeeded`. If the buyer has meanwhile paid the order with a _later_ attempt, the late success is instead handled as A4 (returned, with the reason "order already paid"), so escrow never holds more than one order total.
- Outcome: the buyer is not punished for provider slowness; the order is paid exactly once.

### A6: Payment already in progress

- Condition: at P2 another attempt for this order is `Pending` (a double-click, or two tabs).
- Steps: the new request is rejected with "a payment is already in progress"; the pending attempt is unaffected. Buyer cancellation (UC-001 A1) is likewise refused while a payment is in progress, so a payment hold never has to be unwound by a deliberate cancellation.
- Outcome: at most one attempt is ever pending per order.

### A7: Order no longer payable

- Condition: at P2 the order is `Paid into escrow` or `Cancelled`, or its expiry time has passed even though the sweep has not run yet.
- Steps: the request is rejected with the order's current state; an order past its expiry time is treated as expired.
- Outcome: no attempt is created.

### E1: Unauthorized

- Condition: the caller is not the order's buyer (another buyer, a seller member, an operator, or signed out).
- Steps: rejected with an authorization error (sign-in prompt when signed out). Sellers and operators read payment state through the order; they never start payments.
- Outcome: no state change.

### E2: Invalid provider report

- Condition: a provider message fails signature verification, references an unknown attempt, or carries an amount other than the attempt's amount.
- Steps: rejected and logged; nothing is recorded against the order or the ledger.
- Outcome: forged or corrupt reports cannot move money or state.

## Postconditions

- On success: the order is `Paid into escrow`; exactly one `Succeeded` attempt exists for it with the recorded fee rate; the order's escrow account holds exactly the order total; the listing shows one more sold unit and one fewer reserved; the timeline ends with "Payment secured".
- On failure or timeout: the order is `Awaiting payment` with its original expiry; no money has moved; the timeline ends with "Payment failed".
- On a late success for a dead order: the order is `Cancelled`; the escrow account for the order nets to zero; the timeline ends with "Payment returned".
- Always: every financial record balances (money received equals money held or returned), and every attempt and money movement is attributable to the order, the buyer, and a provider event identifier.

## Data / Validations

### Payment attempt

| Field              | Notes                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Order              | The order being paid; one pending attempt per order                                                                                  |
| Buyer              | Must equal the order's buyer                                                                                                         |
| Amount             | Equals the order total; SEK minor units                                                                                              |
| Status             | `Pending` → `Succeeded` \| `Failed` \| `Timed out` → (`Timed out` → `Succeeded` \| `Reversed`); `Succeeded` → `Reversed` only via A4 |
| Scenario           | Optional; simulated provider only; one of `success`, `failure`, `timeout`, `duplicate_success`                                       |
| Provider reference | The provider's identifier for this attempt                                                                                           |
| Fee rate           | Recorded on success (8% as 800 basis points, PD-0004)                                                                                |
| Started / resolved | Timestamps; a pending attempt times out 15 minutes after start                                                                       |
| Failure reason     | Provider-supplied reason, or "no response from the provider" on timeout                                                              |

### Financial history (per order)

| Entry                          | Movement                                    |
| ------------------------------ | ------------------------------------------- |
| Payment captured into escrow   | provider → this order's escrow, order total |
| Payment returned to buyer (A4) | this order's escrow → provider, order total |

### Rules

- Only the order's buyer may start payment; only while the order is `Awaiting payment` and before its expiry time; only when no attempt is pending.
- The payment hold is 15 minutes from start and never extends the order's 24-hour window.
- Order state transitions in this slice: `Awaiting payment → Paid into escrow` (success); `Awaiting payment` unchanged on failure/timeout; `Cancelled` is never left.
- Listing stock: a success converts one reserved unit to sold; available + reserved + sold = total at all times.
- Provider reports are accepted only with a valid signature and are deduplicated by provider event identifier.
- Every money movement is recorded as a balanced financial entry; entries are never edited or deleted.

### Outputs

- Order detail now includes payment status (`none`, `in_progress`, `paid`, `failed`, `returned`) and the latest attempt's outcome.
- Operator order inspection includes the attempt list and the order's financial history.

## Observability

- Logs: payment attempt started / succeeded / failed / timed out / reversed, with order, attempt, buyer, and provider event ids; provider report rejected (reason). Never log provider secrets or signatures.
- Metrics: payment success rate, failure rate, timeout count, reversal count, duplicate-report count.
- Audit: the attempt record plus the financial history reconstruct every payment outcome; the timeline is the buyer-visible audit trail.

## Security / Compliance

- Auth: starting a payment requires the signed-in buyer who owns the order.
- Authorization: sellers and operators are read-only on payment state through the order they may already view (UC-001, UC-003).
- Provider reports: signed with a shared secret; unsigned or mis-signed reports are rejected before any lookup.
- Audit: see Observability. No card or bank data exists in this phase.

## Non-Goals (this use case)

- Fulfillment, confirmation, release, fee charging, seller settlement (UC-005, Phase 5).
- Refunds, disputes, seller cancellation of a paid order (post-MVP recovery; PD-0004 §6).
- Real payment providers, multiple providers, split or partial payments, currencies other than SEK.
- Notifications ("seller receives paid order") — notification infrastructure is a later phase.
- Any UI.

## Success Metric

A buyer can pay an order through the API and see `Paid into escrow` with "Payment secured" on the timeline; the seller and operator see payment secured; the order's financial history shows the money held in escrow; and every failure, timeout, duplicate, and late-payment scenario leaves money and order state consistent and explained.

## Mapping to Architecture

- Commands: `Payments.StartPayment`, `Payments.HandleProviderCallback`, `Payments.ExpirePendingPaymentAttempts`, `Ledger.PostJournalEntry`, `Orders.HoldOrderForPayment`, `Orders.MarkOrderPaid`, `Orders.RecordPaymentFailed`, `Orders.RecordPaymentReturned`, `Listings.MarkReservedUnitSold`
- Queries: `Payments.GetOrderPayments`, `Ledger.GetOrderFinancialHistory`, `Ledger.GetAccountBalance`, `Orders.GetOrder` (extended with payment status)
- Domain events: `PaymentAttemptStarted`, `PaymentSucceeded`, `PaymentFailed`, `PaymentTimedOut`, `PaymentReversed`, `OrderPaid`
- Integration events: none in this slice (see [ADR-009](../../decisions/ADR-009-payments-and-ledger-modules.md) for why the outbox is deferred)
- Persistence: payment attempts, provider events (deduplication), ledger accounts, journal entries and lines, account balance projection; orders gain `paid_into_escrow`, a payment hold, and new timeline entry types; listings gain a sold counter

Module layout, write ordering, and the simulated provider boundary are decided in ADR-009. The mapping above describes capabilities, not exact class names.
