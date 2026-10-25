# ADR-009: Payments and Ledger Modules, Simulated Provider Boundary, and Payment Write Ordering

Date: 2026-10-25  
Status: Accepted  
Owners: Platform Team

## Context

Phase 4 of the roadmap introduces a buyer paying an order into escrow ([UC-004](../product/use-cases/UC-004-buyer-pays-into-escrow.md)) under the policy set by [PD-0004](../product/decisions/0004-escrow-fee-and-payment-policy.md): an 8% seller-borne fee frozen at payment and charged at release, a 15-minute payment hold against order expiry, late payments returned rather than reviving orders, and a paid order's reserved unit becoming sold. Payment runs through a simulated provider.

The architecture baseline already decides a lot: an append-only double-entry journal with a rebuildable balance projection (ADR-003); state tables plus event history for other modules, with integration events through a transactional outbox (ADR-002); NATS JetStream as the eventual broker (ADR-004); idempotent handlers and database-based coordination for exclusive work (ADR-005); Pure DI with one composition root per module (ADR-007). ADR-007 explicitly left the transaction boundary — how a command keeps several writes in one transaction — for a later ADR.

This ADR is written with a deliberate scope restriction: **the transaction boundary, the outbox and its relay, idempotent consumers, durable `Idempotency-Key` handling, and correlation IDs are all deferred.** The product owner chose to prove the ledger and payment model first and build the durability layer afterwards. That decision shapes everything below, and this ADR must be honest about the gap it leaves.

Three questions need answers before code:

1. Where do payments and the ledger live, and what may each module write?
2. What is the boundary to the (simulated) payment provider?
3. How does a payment result move the order, given that no cross-module transaction exists yet?

Constraints: invariants §1 of `ENGINEERING_STANDARDS.md` (no double charging, no ledger corruption, no inconsistent order states, invariants inside aggregates, concurrency-safe aggregates); no module imports another module's infrastructure or presentation; application code imports no framework; the Postgres test harness is the reference and the in-memory mode must keep working.

## Decision

### 1. Two new modules: `ledger` and `payments`

**`ledger`** owns money. It is the only module that writes financial records.

- Aggregates: `Account`, `JournalEntry` (with its `JournalLine`s).
- Account kinds and normal balance side:
  - `provider_clearing` — debit-normal (asset): funds held at the payment provider on the marketplace's behalf; the external counterparty of every payment. One per provider (`simulated`).
  - `order_escrow` — credit-normal (liability): funds held for one order. One per order, created on first posting.
  - `seller_balance` — credit-normal (liability): funds owed to one seller organization. One per organization. Posted to in Phase 5.
  - `platform_fee_revenue` — credit-normal (revenue): fees earned. One.
- Public commands: `PostJournalEntry` (balanced lines, an entry kind, a reference, and an **idempotency key**; posting the same key twice returns the existing entry and writes nothing), `RebuildAccountBalances`.
- Public queries: `GetAccountBalance`, `GetOrderFinancialHistory` (every entry whose reference or lines touch the order's escrow account).
- Entry kinds in Phase 4: `payment_captured` (Dr `provider_clearing`, Cr `order_escrow`) and `payment_reversed` (Dr `order_escrow`, Cr `provider_clearing`). Phase 5 adds `funds_released` (Dr `order_escrow`; Cr `seller_balance` for total minus fee; Cr `platform_fee_revenue` for the fee).
- Persistence (ADR-003): `ledger_accounts`, `ledger_journal_entries`, `ledger_journal_lines`, `ledger_account_balances`. The journal tables are append-only **enforced by the database**: triggers raise on `UPDATE` and `DELETE`. A deferred constraint trigger rejects any entry whose debit and credit totals differ at commit. Every line amount is strictly positive. The balance projection is updated in the same ledger-internal transaction as the entry insert; `RebuildAccountBalances` recomputes it from the lines and is the reference the projection is tested against.
- The ledger knows nothing about orders, payments, or listings beyond opaque reference strings and account owner identifiers.

**`payments`** owns the payment attempt and the provider boundary.

- Aggregate: `PaymentAttempt` — `pending → succeeded | failed | timed_out`; `timed_out → succeeded` (late success on a live order); `succeeded`/`timed_out` → `reversed` (success on a dead order). Invariants: amount equals the order total; one `pending` attempt per order (also enforced by a partial unique index on `(order_id) WHERE status = 'pending'`); the fee rate in basis points is recorded on success and never changed.
- Public commands: `StartPayment`, `HandleProviderCallback`, `ExpirePendingPaymentAttempts` (job-driven, like `ExpireOverdueOrders`).
- Public queries: `GetOrderPayments` (every attempt for an order; operator-only over HTTP).
- Ports (`application/ports.ts`): `PaymentAttemptRepository`; `PaymentProvider` (below); `PayableOrders` — read a payable order and apply payment outcomes, adapted in `src/bootstrap/` over the orders module API; `LedgerPostings` — post capture and reversal entries, adapted over the ledger module API.
- Persistence: `payment_attempts`, `payment_provider_events` (one row per provider event id, for deduplication and audit).

**Changes to existing modules**, each through its own public API:

- `orders`: new status `paid_into_escrow`; a `payment_hold_until` column; timeline entry types `payment_secured`, `payment_failed`, `payment_returned`; commands `HoldOrderForPayment`, `MarkOrderPaid` (idempotent per attempt id; converts the unit to sold through the existing `ListingReservations` port), `RecordPaymentFailed` (clears the hold), `RecordPaymentReturned`; `findExpired` excludes rows whose hold is still active; `cancel` is rejected for paid orders. `GetOrder` embeds a payment summary derived from the order's own state (below), so the order response stays the single read for buyer, seller, and admin.
- `listings`: `quantity_sold` column; `MarkReservedUnitSold` moves one unit from reserved to sold; the check constraint becomes `reserved >= 0 AND sold >= 0 AND reserved + sold <= total`.

Module dependency direction, all via composition-root adapters: `payments → orders`, `payments → ledger`, `orders → listings`. There is no `orders → payments` edge: the order's payment summary (`none`, `in_progress`, `paid`, `failed`, `returned`) is **derived from the order's own state** — status, payment hold, and the latest timeline entry — so it can never disagree with the order and needs no status-source port. Attempt-level detail is operator-only through the payments module (`GET /api/orders/:id/payments`). (The proposal originally included a `PaymentStatusSource` port; implementation showed it unnecessary.)

### 2. Provider boundary

- `PaymentProvider` is a port in `payments/application`: `startPayment(attempt) → { providerReference }`. Nothing else: the provider's answer always arrives as a **callback**, never as a return value, so the code path is the same for the simulated provider and a real one.
- Callbacks are HTTP webhooks: `POST /api/payments/provider/callbacks`. The body carries `providerEventId`, `attemptId` (our id, handed to the provider at start and echoed back — the lookup key, so a callback that arrives before the provider's own reference is recorded still resolves), `providerReference`, `type` (`succeeded` | `failed`), `amountMinor`, `currency`, and `failureReason`. The request is signed with HMAC-SHA256 over the raw body using `PAYMENT_PROVIDER_WEBHOOK_SECRET`, carried in `x-provider-signature`. Verification happens in the route before any lookup; a bad signature is rejected with no state change and a log line.
- `SimulatedPaymentProvider` (`payments/infrastructure/provider/`) implements the port. After `StartPayment` has committed the attempt, it produces a signed callback according to the attempt's scenario and delivers it **in-process to the same callback handler the webhook route uses**, so the simulated path exercises signature verification and deduplication too:
  - `success` → one `succeeded` callback;
  - `failure` → one `failed` callback;
  - `timeout` → no callback (the attempt times out after 15 minutes; tests can hand-deliver a late callback through the webhook route);
  - `duplicate_success` → the same `succeeded` callback twice.
    The scenario field is accepted by the API only when `PAYMENT_PROVIDER=simulated`; otherwise it is rejected as validation error. Delivery is deferred to after the start transaction commits, and in tests it is awaited so outcomes are deterministic.
- Configuration (composition root only): `PAYMENT_PROVIDER` (`simulated`), `PAYMENT_PROVIDER_WEBHOOK_SECRET`, `PAYMENT_ATTEMPT_TIMEOUT_MINUTES` (15), `PAYMENT_TIMEOUT_SWEEP_INTERVAL_MS`, `PLATFORM_FEE_BPS` (800).

### 3. How a payment result moves the order: ordered, idempotent, sequential writes

There is no cross-module transaction yet, so `HandleProviderCallback` performs **separate commits in a fixed order, each idempotent, so that re-running the handler converges**:

1. **Verify and record the provider event.** Insert into `payment_provider_events` by `providerEventId`; if it already exists, continue anyway — a redelivery is the retry mechanism for a partial failure, not a reason to stop. Load the attempt by `attemptId`; reject if the provider, amount, or currency differs.
2. **Post to the ledger first.** `payment_captured` with idempotency key `${attemptId}:captured`. Money is now provably held. If the handler dies here, escrow holds funds for an order still `awaiting_payment` — the conservative side: nothing has been promised to the seller.
3. **Move the order.** `MarkOrderPaid(orderId, attemptId, feeRateBps)`. The orders module, inside its own aggregate transaction, flips the status, records the fee rate, converts the unit to sold via listings, and appends "Payment secured". It is a no-op when the order is already paid by the same attempt. If the order is `cancelled`, it returns that fact instead of throwing.
4. **Resolve the attempt.** `succeeded` — or, when step 3 reported a cancelled order: post `payment_reversed` (`${attemptId}:reversed`), call `RecordPaymentReturned`, and mark the attempt `reversed`.
5. **Failure callbacks** skip the ledger: mark the attempt `failed`, then `RecordPaymentFailed` (clears the hold, appends the timeline entry).

**Concurrency.** Deliveries legitimately race: a duplicate callback may be delivered twice in parallel, and the simulated provider's callback may arrive while `StartPayment` is still recording the provider reference. The handler and the order-side payment commands therefore retry on an optimistic-lock conflict by re-reading and re-applying; because every step is idempotent per attempt, both racing paths converge on the same end state. Buyer cancellation is refused while a payment hold is active, so a hold is only ever cleared by the payment's own outcome or by its timeout.

Why ledger before order: "escrow funded, order unpaid" is recoverable by a retry and never tells the seller to ship; "order paid, escrow empty" is the one state that violates the trust promise. This ordering was confirmed by the product owner on 2026-10-25 as the accepted trade-off. Why the attempt status is written last: it is the signal `GetOrderPayments` and operators read, and it must only say `succeeded` when every effect is in place.

**Read model.** Payment status is embedded in the existing order response (`GET /api/orders/:id`), so buyer, seller, and platform admin keep a single read. The itemized financial history (`GET /api/orders/:id/financial-history`) is a platform-admin-only route served by the ledger module's `GetOrderFinancialHistory` query, matching PD-0004 §8.

**Known failure windows** (recorded as active risks in `PROJECT_STATE.md`):

- A crash between steps 2 and 4 leaves the attempt `pending`, with escrow funded and the order possibly unpaid, until the provider redelivers or the attempt times out. A timed-out attempt with a funded escrow must be detectable: `ExpirePendingPaymentAttempts` checks the ledger for a `${attemptId}:captured` entry before marking an attempt `timed_out`, and instead re-runs steps 3–4. This is the manual-free recovery path.
- Order status and the unit-sold conversion are two aggregates in two transactions inside step 3; the same single-aggregate guarantee and compensation pattern the orders module already documents applies.

These windows close when the unit-of-work ADR lands; the handler's step order is designed so that wrapping steps 2–4 in one transaction is a mechanical change.

### 4. What is deliberately not built here

- **No transaction boundary / unit of work** (ADR-007's open question stays open).
- **No outbox, relay, or integration events.** `OrderPaid.v1`, `PaymentSucceeded.v1`, and the rest are not registered; the event catalog notes why. Cross-module effects are synchronous API calls through composition-root adapters, like `ListingReservations` today.
- **No `Idempotency-Key` handling** on `StartPayment`. The partial unique index on pending attempts is the only guard against concurrent starts; a retried start after a failed attempt legitimately creates a new attempt.
- **No correlation IDs.**

Each is a named roadmap item.

### 5. Testing

- Domain: `PaymentAttempt` state machine; `JournalEntry` balance rule; `Money` arithmetic and rounding.
- Ledger property tests (fast-check, new dev dependency): any generated sequence of balanced postings leaves every entry balanced and makes `RebuildAccountBalances` reproduce the live projection exactly; an unbalanced entry is always rejected.
- Persistence (Postgres only): journal `UPDATE`/`DELETE` raise; unbalanced entries fail at commit; one pending attempt per order.
- API: every UC-004 flow through HTTP with the simulated provider; signature rejection; authorization matrix extended to the new routes.
- Application: callback redelivery after a simulated failure between steps converges; `ExpirePendingPaymentAttempts` recovers a funded-but-pending attempt; the expiry sweep skips held orders.
- Workflow: order → pay → paid, asserting the ledger balances and the escrow account equals the order total.
- In-memory implementations exist for both new modules so `TEST_PERSISTENCE=memory` keeps running; database-enforced guarantees are Postgres-only tests.

## Consequences

### Positive

- Money has exactly one writer; the journal's append-only and balance rules are enforced by Postgres, not by discipline.
- The provider boundary is a port plus a webhook, so replacing the simulated provider changes one adapter and removes one request field.
- Write ordering is explicit and documented; every step is idempotent, so the future transaction boundary wraps it without redesign.
- The order remains the single read model for buyer, seller, and operator; payment and financial detail attach to it rather than fragmenting the API.

### Negative / Trade-offs

- Until the unit-of-work ADR lands, a crash mid-callback can leave escrow funded with the order unpaid; recovery depends on provider redelivery or the timeout sweep. This is an accepted, recorded risk, not a hidden one.
- No outbox means no durable integration events in Phase 4; Phase 5 notification or settlement consumers will need the outbox first.
- A scenario field sits on a public API route while the simulated provider exists.

## Alternatives considered

1. **One `payments` module owning both attempts and the ledger**
   - Pros: no cross-module call on the success path; simpler wiring.
   - Cons: the ledger is the single most protected thing in the system and will be written to by release, refund, and settlement flows that have nothing to do with payment attempts; co-locating them invites ad-hoc postings. ADR-003 already treats the ledger as its own persistence model.
2. **Payment result moves the order through an integration event (outbox + consumer)**
   - Pros: orders stays unaware of payments; matches the long-term event architecture.
   - Cons: requires the outbox, which is out of scope by decision; and even with it, "escrow funded, order unpaid" would be a _designed_ window rather than a failure window, so the expiry sweep would need payment awareness anyway. Revisit when the outbox exists; the synchronous call can become a consumer behind the same `PayableOrders` port.
3. **Order moved before the ledger posting**
   - Pros: the buyer-visible state changes fastest.
   - Cons: a crash leaves a paid order with no money held — the one state the product promise forbids.
4. **Provider result returned synchronously from `startPayment`**
   - Pros: no webhook, no signature, no deduplication in Phase 4.
   - Cons: a real provider never works that way; the simulated path would exercise none of the code a real integration needs, and duplicate and late callbacks could not be simulated.
5. **Expiry sweep queries payments for pending attempts instead of an order-side hold**
   - Pros: no new column on orders.
   - Cons: a cross-module query inside the sweep, and a stuck attempt could pin the order indefinitely; a time-bounded hold on the order self-heals.

## Notes / Links

- Related ADRs: ADR-002 (persistence and events), ADR-003 (append-only ledger), ADR-004 (JetStream, deferred), ADR-005 (idempotent handlers), ADR-007 (Pure DI; transaction boundary left open)
- Related product docs: PD-0004, UC-004, `docs/product/feature-specs/escrow-payment.md`
- Related standards: `docs/ENGINEERING_STANDARDS.md` §1, §2.5
- Follow-up ADR: unit of work / transaction boundary, then transactional outbox and relay
- Related PRs/issues: N/A
