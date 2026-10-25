# Payments Module

Location: `apps/backend/src/modules/payments/`

Bounded context: one buyer's attempt to pay for one order, and the boundary to the payment
provider. Implements [UC-004](../../../../../docs/product/use-cases/UC-004-buyer-pays-into-escrow.md)
under [PD-0004](../../../../../docs/product/decisions/0004-escrow-fee-and-payment-policy.md) and
[ADR-009](../../../../../docs/decisions/ADR-009-payments-and-ledger-modules.md). Phase 4 runs on a
built-in simulated provider.

---

# 1. Responsibilities

This module is responsible for:

- Payment attempts: start, provider callback handling, timeout, and their status machine.
- The provider boundary: a port for starting a payment and a signed, deduplicated webhook for the
  outcome.
- Driving the two Phase 4 money movements (capture into escrow, return to buyer) through the
  ledger, and moving the order through the orders module, in the write order ADR-009 §3 fixes.
- The operator's view of an order's attempts.

This module is NOT responsible for:

- Recording money (ledger), order state and the timeline (orders), or stock (listings).

Single source of truth for: **PaymentAttempt** and provider events.

---

# 2. Public API

Declared in `payments.api.ts`; `payments.module.ts` returns it together with the callback decoder
and the simulated provider (for tests).

## Commands

- `StartPayment` — UC-004 P1–P3. Validates buyer and payability, inserts a `pending` attempt (the
  database's one-pending-per-order index is the concurrency guard, A6), holds the order against
  expiry for 15 minutes, asks the provider to collect, records the provider's reference.
  `POST /api/orders/:orderId/pay` → 202.
- `HandleProviderCallback` — UC-004 P4–P5, A1, A3, A4, A5. Verifies amount and provider, records the
  provider event id, then: on failure, fails the attempt and clears the hold; on success, posts the
  capture, moves the order (`SettleCapturedPayment`), and resolves the attempt — or returns the
  money when the order cannot take it. Retries itself on a version conflict; every step is
  idempotent, so parallel or repeated deliveries converge. `POST /api/payments/provider/callbacks`.
- `ExpirePendingPaymentAttempts` — UC-004 A2. Times out overdue attempts and clears their holds;
  an overdue attempt whose capture is already in the ledger is settled instead (ADR-009 §3
  recovery). Driven by `src/jobs/payment-timeout-job.ts`.

## Queries

- `GetOrderPayments` — every attempt for an order. Platform admins only,
  `GET /api/orders/:orderId/payments`.

---

# 3. Domain Model

- `PaymentAttempt` (`domain/payment-attempt.ts`)
  - Invariants: amount equals the order total; `pending → succeeded | failed | timed_out`;
    `timed_out → succeeded` (late success on a live order); `pending | timed_out | succeeded →
    reversed` (money arrived for an order that could not keep it); resolving the same way twice is a
    no-op; the fee rate is recorded once, at success.
  - Scenarios (simulated provider only): `success`, `failure`, `timeout`, `duplicate_success`.

---

# 4. Events

None. Cross-module effects are synchronous calls through composition-root adapters (ADR-009 §4).
`OrderPaid.v1` and `PaymentSucceeded.v1` wait for the transactional outbox.

---

# 5. Ports

- `PaymentAttemptRepository` — attempts and provider-event deduplication.
- `PaymentProvider` — `startPayment` returns a reference; the outcome always arrives as a callback.
  Implemented by `SimulatedPaymentProvider` (`infrastructure/provider/`), which delivers signed
  callbacks in-process through the same decoder and handler as the webhook, as a background task
  that runs after the start has committed.
- `PayableOrders` — adapted over the orders module in `src/bootstrap/payable-orders.ts`.
- `LedgerPostings` — adapted over the ledger module in `src/bootstrap/ledger-postings.ts`.
- `PaymentPolicy` — `platformFeeBps` (800) and `attemptTimeoutMs` (15 min) from configuration.

---

# 6. Persistence

Tables: `payment_attempts` (partial unique index: one `pending` per order), `payment_provider_events`
(primary key `(provider, provider_event_id)`).

---

# 7. Transactions & Concurrency

Attempts are optimistically locked by `version`. There is no transaction spanning the ledger, the
order, and the attempt (ADR-009 §3): writes happen ledger → order → attempt, each idempotent per
attempt, so a redelivered callback or the timeout sweep repairs a crash between steps. The one
state this ordering can never produce is a paid order with no money held.

Callback security: HMAC-SHA256 over the raw body with `PAYMENT_PROVIDER_WEBHOOK_SECRET`, header
`x-provider-signature`, verified before parsing (`ProviderCallbackCodec`).

---

# 8. Cross-Module Collaboration

- **orders** — `PayableOrders`: load (via `GetOrder`), hold, mark paid, record failed, record
  returned.
- **ledger** — `LedgerPostings`: capture, return, has-capture.

---

# 9. Testing

- Domain: `test/unit/payments/payment-attempt.unit.spec.ts`
- HTTP, every UC-004 flow: `test/integration/api/payments.api.int.spec.ts`
- Timeout, hold vs expiry, recovery: `test/integration/application/payment-timeout.application.int.spec.ts`
- End to end with a balanced ledger: `test/integration/workflows/order-to-escrow.workflow.int.spec.ts`

---

# 10. Known Gaps

- No real provider; the `scenario` request field is a simulated-provider affordance (PD-0004 §9).
- No `Idempotency-Key` on `StartPayment`; the pending-attempt index is the only guard against
  concurrent starts.
- Failure windows between the ordered writes, until the unit-of-work ADR (roadmap "Backend
  reliability").
