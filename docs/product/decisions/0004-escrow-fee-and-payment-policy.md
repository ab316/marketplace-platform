# Product Decision: Escrow, Fee, and Payment Policy

## Status

Accepted

## Date

2026-10-25

## Context

The MVP trust loop needs a buyer to pay into escrow ([`mvp-scope.md`](../mvp-scope.md) §5, backlog P0-007) before fulfillment, release, and settlement can be built. The business rules already say that a successful payment moves funds into escrow, that escrow belongs to the order until release or refund, that the marketplace fee is applied on release, and that a cancelled unpaid order can never be paid ([`business-rules-policies.md`](../business-rules-policies.md)). They do not yet say how large the fee is, what happens when a payment and the 24-hour reservation expiry ([UC-001](../use-cases/UC-001-buyer-orders-refurbished-laptop.md)) collide, what a paid order does to listing stock, what happens when a seller cannot fulfill a paid order, or whether funds ever release automatically. The roadmap gates Phase 4 on settling these ([`roadmap.md`](../roadmap.md)).

Payment is simulated in this phase: a fake provider stands in for a real one so that the money model can be proven before provider complexity is added (roadmap risk: "Adding payment complexity before simulated flows prove the model").

## Decision

1. **Marketplace fee: 8% of the order total, borne by the seller.** The fee is a single platform-wide percentage with no minimum, no flat component, and no buyer-side surcharge. It is computed in SEK minor units (öre) with round-half-up. The fee is **charged when funds are released** to the seller (Phase 5), but the rate in force is **frozen on the order at the moment payment succeeds**, so a later rate change never alters an in-flight order's economics. The buyer always pays exactly the listed price.

2. **A payment in progress protects the reservation, for a bounded time.** Starting a payment places a 15-minute **payment hold** on the order. The automatic expiry sweep leaves an order alone while its hold is active, and the buyer cannot cancel it either: a payment in flight is only ever resolved by its own outcome or its timeout, never unwound by a deliberate cancellation. A payment attempt that the provider has not resolved within 15 minutes **times out**; the hold lapses with it and the order becomes eligible for expiry again. The order's own 24-hour window is unchanged and still counted from order creation; paying does not extend it.

3. **Payment never revives a cancelled or expired order.** If a successful payment arrives for an order that is already cancelled or expired, the funds are recorded as received and **returned to the buyer immediately**, the order stays cancelled, and the order timeline records "Payment returned" with the reason. Money is never silently created or lost: the financial history shows the round trip.

4. **A paid order's reserved unit becomes sold.** Listing stock is tracked as total, reserved, and sold; reserved plus sold never exceeds total. A sold unit is never returned to stock by cancellation or expiry, because paid orders are no longer cancellable by the buyer in the MVP (recovery flows are post-MVP).

5. **A failed payment keeps the order recoverable.** On failure the order stays `Awaiting payment` with its original expiry, the timeline records "Payment failed", and the buyer may try again as long as the order is alive. At most one payment attempt is in progress per order at any time.

6. **A seller who cannot fulfill a paid order is handled by the recovery workflows, not by this phase.** The money model is designed so a full refund is one reversing financial record, but no seller-cancel or refund action ships in Phase 4. Until recovery ships, an unfulfillable paid order is resolved by the operator out of band. Tracked as backlog P1-002/P1-003.

7. **No automatic release window.** Funds release only on buyer confirmation (Phase 5). Automatic release after a confirmation window remains a future rule ([`business-rules-policies.md`](../business-rules-policies.md) "Release conditions").

8. **Who sees the money.** Buyers and sellers see payment state in plain language on the order and its timeline. The itemized financial history (every ledger movement touching the order) is an operator view, visible to platform administrators only. Exposing per-order ledger detail to buyers or sellers is a later product decision.

9. **Simulated provider.** Phase 4 uses a built-in simulated payment provider. The buyer's payment request may carry an explicit **scenario** (success, failure, timeout, duplicate callback) so demos and tests can exercise every outcome. The scenario field is accepted only while the simulated provider is in use and is not part of the long-term product surface.

## Options considered

### Fee structure

#### Option A: Percentage at release, frozen at payment, seller-borne (chosen)

Pros:

- One number; visible in seller settlement as "fee"; the buyer sees exactly the listed price.
- Freezing the rate at payment keeps every order's economics stable from the moment money moves.
- Charging at release matches the existing rule and keeps escrow holding the full amount, so a full refund before release needs no fee reversal.

Cons:

- Sellers with very low-priced items pay almost nothing; a minimum fee may be needed later.
- A percentage alone does not cover fixed per-transaction costs.

#### Option B: Flat fee per order

Pros:

- Predictable for sellers; trivial to compute.

Cons:

- Punishes low-priced listings; the refurbished-laptop range (roughly 2 000 – 20 000 SEK) makes a percentage fairer.

#### Option C: Buyer-side service fee added at checkout

Pros:

- Seller receives the full listed price.

Cons:

- The listed price stops being the price paid, which undermines the "no surprises" promise of UC-001 and complicates the escrow amount.

### Payment racing reservation expiry

#### Option A: Bounded payment hold; late success is returned, never revives (chosen)

Pros:

- A buyer mid-checkout cannot lose the unit; the hold is short, so a stuck attempt cannot pin stock for long.
- The order state machine stays one-directional: cancelled is terminal, as UC-001 already promises.
- Late money has an explicit, visible outcome.

Cons:

- A buyer whose payment succeeds just after expiry gets their money back and must reorder; rare, and the timeline explains it.
- Needs a second timer (attempt timeout) alongside order expiry.

#### Option B: Expire regardless of payment in progress; refund anything that arrives

Pros:

- Simplest sweep.

Cons:

- Buyers paying in the last minutes of the window routinely lose the unit; bad experience, more reversals.

#### Option C: A late successful payment revives the order

Pros:

- The buyer gets what they paid for.

Cons:

- The unit may already be sold to someone else; reviving breaks "cancelled is terminal" and makes stock accounting non-monotonic.

### Stock after payment

#### Option A: Reserved unit becomes sold (chosen)

Pros:

- Availability stays honest for other buyers; stock accounting mirrors the order lifecycle.

Cons:

- Adds a third stock counter.

#### Option B: Keep the unit reserved until fulfillment completes

Pros:

- No new counter.

Cons:

- "Reserved" would mean two different things, and a paid unit could be mistaken for one that may free up.

## Reasoning

The trust promise is "buyers understand when money is protected and when it is released" and "financial correctness for payment, escrow hold, release, fee, and settlement" ([`mvp-scope.md`](../mvp-scope.md) §MVP success criteria). Each rule above picks the option that keeps money movement explicit and one-directional. A short payment hold is the smallest mechanism that resolves the race without weakening order expiry, and returning late money instead of reviving orders keeps every state machine monotonic. Freezing the fee rate at payment is what makes a later pricing change safe. Deferring unfulfillable paid orders to the recovery workflows follows the existing rule that refunds and disputes come after the direct loop works end to end.

## Consequences

- Engineering can build the ledger with four account kinds (provider clearing, per-order escrow, per-seller balance, platform fee revenue) and two Phase 4 money movements (capture into escrow, return to buyer); release and fee posting arrive in Phase 5 with the rate already recorded.
- The order gains the states and timeline entries `Paid into escrow`, "Payment secured", "Payment failed", and "Payment returned"; the expiry sweep must respect the payment hold.
- Listing stock gains a sold counter; the UC-001 postcondition becomes "available + reserved + sold = total".
- The scenario field is explicit technical debt on the API surface: it disappears when a real provider replaces the simulated one.
- The 8% rate and the 15-minute hold are configuration, not code, so they can be tuned without a product decision; changing the _structure_ of the fee or the racing rule needs a new PD.
- An unfulfillable paid order has no self-serve path until P1-002/P1-003 ship; operators must be aware.

## Affected documents

- `docs/product/roadmap.md` — Phase 4 shaping gates closed; deferred reliability work recorded
- `docs/product/mvp-scope.md` — unchanged (this decision implements its §5)
- `docs/product/product-backlog.md` — P0-007 Ready; P1-002/P1-003 note the unfulfillable-paid-order case
- `docs/product/business-rules-policies.md` — fee rate, payment hold, racing rule, sold units
- `docs/product/feature-specs/escrow-payment.md`
- `docs/product/use-cases/UC-004-buyer-pays-into-escrow.md`
- `docs/product/use-cases/UC-001-buyer-orders-refurbished-laptop.md` — amended: pay action, payment hold, sold units

## Review date

Revisit when a real payment provider replaces the simulated one, or when seller settlement data (Phase 5) shows the 8% rate or the absence of a minimum fee is wrong for the niche.
