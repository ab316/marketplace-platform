# Roadmap

The roadmap: what we're building, what's next, and why. This is the durable baseline agents read when shaping work.

**Current focus:** Phase 4 — the simulated escrow payment and double-entry ledger for [UC-004](use-cases/UC-004-buyer-pays-into-escrow.md) — is built, under the policy in [PD-0004](decisions/0004-escrow-fee-and-payment-policy.md) and the module layout in ADR-009. Next is the "Backend reliability" block: the durability work (transaction boundary, outbox, idempotency keys, correlation IDs, destructive tests) deliberately deferred from Phases 1, 3, and 4, which must close before Phase 5 builds on the money model or anything is released. After that: fulfillment, release, and inspection (Phase 5), then UI work in Phase 6. The niche is chosen ([PD-0002](decisions/0002-refurbished-computers.md)); the trust-centered product model and MVP boundary remain defined by [PD-0001](decisions/0001-product-direction.md) and [`mvp-scope.md`](mvp-scope.md).

Outcome-driven. Keep dates out until there is real delivery cadence. When a phase is ready to build, turn it into a use case in `docs/product/use-cases/` and (optionally) a plain GitHub issue for tracking.

## Now

- [x] Repository bootstrap
  - Deliverables:
    - Monorepo scaffold
    - Initial backend architecture docs
    - AI role/workflow docs
  - Success metric:
    - Repository is usable as a starting point

- [x] Phase 0 - Product Direction
  - Goal:
    - Choose the marketplace niche and first demo workflow
  - Done so far:
    - [x] Product model defined: trust-centered marketplace with escrow, order timeline, fulfillment, disputes, refunds, settlement (PD-0001; `product-brief.md`, `vision-problem-strategy.md`)
    - [x] MVP scope and non-goals defined (`mvp-scope.md`) — offers/negotiation deferred post-MVP
    - [x] Feature catalog, backlog, business rules, success metrics drafted (`feature-catalog.md`, `product-backlog.md`, `business-rules-policies.md`, `success-metrics.md`)
    - [x] Niche chosen: refurbished computers sold by seller organizations (PD-0002; `discovery.md`)
    - [x] First stable use case approved: [UC-001](use-cases/UC-001-buyer-orders-refurbished-laptop.md) — laptops only, pooled-stock listings, immediate single-unit orders in SEK, 24-hour unpaid reservation expiry
  - Success metric:
    - A new AI session can explain what the first product slice is and why it matters

- [ ] Phase 1 - Reliable Marketplace Backend
  - Goal:
    - Make the UC-001 HTTP workflow reliable on real Postgres
  - Workflow (specified by [UC-001](use-cases/UC-001-buyer-orders-refurbished-laptop.md); offers are deferred):
    - seller organization publishes a refurbished-laptop listing
    - buyer discovers the listing and creates an order
    - order timeline shows what happened and what's next
  - Implemented:
    - [x] Listing publication and discovery, single-unit orders, immutable snapshots, and order timelines over HTTP
    - [x] Buyer cancellation and an automated unpaid-reservation expiry sweep
    - [x] Shared Zod API contracts in `packages/api-contracts`, consumed by the backend
    - [x] Domain/API/application tests using in-memory persistence
    - [x] Postgres repositories and migrations written and verified manually (up/down/up, full workflow smoke test)
    - [x] Testcontainers-backed harness: API and application integration suites run against real Postgres by default, locally and in CI; in-memory persistence is an opt-in fast loop (`TEST_PERSISTENCE=memory`)
    - [x] Automated migration test: up → down → up on a fresh database, replacing the manual check
  - Remaining deliverables:
    - Moved to the "Backend reliability" block under Next: the transaction-boundary ADR, atomic persistence for reservation + order + timeline, multi-instance-safe expiry, the destructive Postgres tests, and correlation IDs
  - Success metric:
    - The HTTP workflow preserves stock, order state, and audit history under real database failures and concurrency

## Next

- [x] Phase 2 - Identity and Access Control
  - Goal:
    - Replace the `x-actor-id` stub with real accounts, organizations, and role-based access
  - Defined by [PD-0003](decisions/0003-identity-and-organization-access.md), the [feature spec](feature-specs/identity-and-access-control.md), [UC-002](use-cases/UC-002-user-signs-up-and-signs-in.md), and [UC-003](use-cases/UC-003-seller-organization-and-member-management.md). No SSO; email verification and password reset are deferred backlog items (P1-008/P1-009).
  - Deliverables:
    - [x] Email/password sign-up, sign-in, sign-out, and sessions (opaque server-side sessions, ADR-008)
    - [x] `identity` module owning users, organizations, memberships, and the fixed role set (owner/manager/viewer + platform admin)
    - [x] Self-serve organization creation; owner-managed members; last-owner and one-org-per-user invariants enforced under concurrency
    - [x] Platform-admin cross-organization inspection — including the authorized operator order-inspection API — and organization deactivate/reactivate (no hard deletes)
    - [x] Existing listing/order endpoints enforced against real memberships; the seed-actor stub removed; authorization matrix (route × role × org) covered by allow and deny tests
  - Success metric:
    - Every API action is attributed to an authenticated user, sellers can only act within their own organization per role, and the full authorization matrix is tested

- [ ] Phase 3 - Order Lifecycle
  - Goal:
    - Turn orders into auditable state machines
  - Deliverables:
    - [x] Initial order aggregate with awaiting-payment → cancelled transitions (buyer cancellation or expiry)
    - [x] Order creation/cancellation history exposed by the order API
    - [ ] Durable, reusable `Idempotency-Key` handling, applied first to order creation: the same key and body replays the original response; the same key with a different body is rejected. Deferred to the "Backend reliability" block; payments will reuse it.
    - [ ] Repeat-cancellation behavior decided and recorded in UC-001 (Level 1)
    - [ ] Retry and concurrency tests: parallel identical requests, key reuse with a different body, repeated cancellation
  - Success metric:
    - Order state changes are explicit, tested, and visible

- [ ] Phase 4 - Simulated Escrow Payment and Ledger
  - Goal:
    - Prove financial correctness of the money model without external payment-provider complexity
  - Shaping (gates before code):
    - [x] UC-004: buyer pays into simulated escrow (P0-007), including payment failure, timeout, duplicate callback, and late payment for a dead order
    - [x] PD-0004: escrow, fee, and payment policy — 8% seller-borne fee frozen at payment and charged at release; a 15-minute payment hold that the expiry sweep respects; a late successful payment is returned and never revives the order; a paid order's reserved unit becomes sold; unfulfillable paid orders deferred to recovery work; no automatic release window
    - [x] ADR-009: `payments` and `ledger` modules, the simulated provider boundary (port plus signed webhook, explicit scenario field), and ordered idempotent writes for the payment result
  - Deliverables:
    - [x] Double-entry ledger (ADR-003): provider clearing, per-order escrow, seller balance, and fee revenue accounts; append-only journal enforced by the database; every entry balances; rebuildable balance projection; property-based tests
    - [x] Money arithmetic (add, subtract, percentage with round-half-up) in the shared domain package
    - [x] Simulated payment provider behind a port: payment start, signed and deduplicated callbacks, scenarios for success, failure, timeout, and duplicate callback
    - [x] Payment attempts with one pending attempt per order, a 15-minute timeout sweep, and the frozen fee rate
    - [x] Order moves to paid into escrow with "Payment secured" / "Payment failed" / "Payment returned" timeline entries; the expiry sweep respects the payment hold; the listing converts the reserved unit to sold; payment status visible to buyer, seller, and operator
    - [x] Tests for duplicates, retries, concurrent starts, payment racing expiry, and callback redelivery after a partial failure, plus a workflow test asserting a balanced ledger
  - Deliberately deferred from this phase (see "Backend reliability" below): the transaction boundary, the transactional outbox and integration events, durable `Idempotency-Key` handling, and correlation IDs. ADR-009 documents the failure windows this leaves and how the handler converges on retry.
  - Success metric:
    - Every payment outcome leaves money and order state consistent and explained, and the ledger balances under every simulated scenario

- [ ] Backend reliability (deferred from Phases 1, 3, and 4; required before any release)
  - [ ] ADR deciding the unit-of-work / transaction boundary ADR-007 left open, covering the cross-module stock reservation and the payment-result writes ordered in ADR-009
  - [ ] Atomic persistence for order creation, cancellation, expiry, and the payment success path (ledger posting, order status, unit sold); remove the compensating release from order creation
  - [ ] Transactional outbox with a relay (in-process first; NATS JetStream per ADR-004 behind a port) and idempotent consumers; register `OrderPlaced.v1`, `OrderPaid.v1`, and friends in `EVENT_CATALOG.md` before producer code
  - [ ] Durable, reusable `Idempotency-Key` handling for order creation and payment start
  - [ ] Expiry and timeout sweeps safe when several backend instances run them at once (ADR-005)
  - [ ] Correlation ID on every request and job, carried into structured logs (ENGINEERING_STANDARDS §6)
  - [ ] Destructive tests on Postgres: injected mid-transaction failure rolls back, last-unit contention, cancellation racing expiry, concurrent sweeps, crash between payment writes — no leaked stock, no unpaid order with funded escrow

- [ ] Phase 5 - Fulfillment, Release, and Inspection
  - Goal:
    - Complete the MVP trust loop end to end on the backend: pay → fulfill → confirm → release → inspect
  - Shaping (gate before code):
    - [ ] UC-005: seller fulfills, buyer confirms, funds release (P0-008 – P0-012), including seller settlement status
  - Deliverables:
    - [ ] Order states in fulfillment → awaiting buyer confirmation → completed; seller starts fulfillment, posts non-empty updates, and submits for confirmation; buyer confirms; every transition appends a timeline entry; authorization matrix extended
    - [ ] Fund release on confirmation: escrow to seller balance minus marketplace fee, atomic and idempotent, with a "Funds released" timeline entry
    - [ ] Seller order list filterable by status — orders needing fulfillment and awaiting confirmation (MVP seller dashboard)
    - [ ] Buyer order list filterable by status and "needs action" (MVP buyer dashboard)
    - [ ] Seller settlement view: released amount, fee, and settlement status per order (P1-006 MVP subset)
    - [ ] Operator order inspection (P0-013): order list and search with status filter, stuck-order filter by time in state, and order detail with payment state and financial history
    - [ ] Backend workflow test of the full loop with balanced-ledger assertions
  - Success metric:
    - A buyer and seller complete one trusted order — order, pay, fulfill, confirm, release — through the API, with a balanced ledger and a complete timeline an operator can inspect

- [ ] Refinements (interleave between phases; not blocking)
  - [ ] Listing drafts may be incomplete; publishing rejects with field-level reasons (UC-001 S1/E1 — today draft creation already requires every disclosure)
  - [ ] Catalogue hides deactivated sellers without the current 1000-organization cap
  - [ ] Basic browse filters (brand, price range, condition grade, RAM) and sorting (price, newest) — MVP "basic filters"
  - [ ] Restock an active pooled-stock listing — needs a short product decision and a UC-001 amendment first
  - [ ] Command to provision platform admins, replacing manual SQL
  - [ ] Contract tests for shared API response shapes

Phases 1–5 establish the backend for the MVP trust loop. A visible product demo follows in Phase 6; full product scope remains defined by `mvp-scope.md`.

Suggested order: Phase 4 build (ledger and payments) → Backend reliability → Phase 5. Phase 1's remaining items and Phase 3's idempotency item live in the Backend reliability block. Refinements fill gaps between phases.

## Later

- [ ] Phase 6 - Web Workflow and API Client
  - Goal:
    - Expose the implemented marketplace workflow through a usable web demo
  - Deliverables:
    - Rough UX direction and feature design input under `docs/design/`, with Figma used if needed
    - Next.js frontend initialized in `apps/web`
    - Shared API contracts consumed by both apps
    - Automatically generated OpenAPI specification and typed frontend client, with a generation command and CI drift check (see [Tech Stack](../TECH_STACK.md#planned-generated-openapi-and-frontend-client))
    - Seller listing publication, buyer discovery/ordering/payment, fulfillment and confirmation, and order timeline/actions connected to the backend
    - Focused frontend tests and a critical browser-to-backend workflow test
  - Success metric:
    - The product can be demoed locally through the web UI

Product-level phasing (details in `feature-catalog.md` and `product-backlog.md`):

- [ ] Recovery and trust workflows — notification infrastructure first (unblocks P1-007 notifications, P1-008 email verification, P1-009 password reset), then full refunds (P1-002/P1-003) before basic disputes (P1-004/P1-005), plus fuller operator queues
- [ ] Experience improvements — offers/negotiation, listing quality guidance, advanced search/ranking, seller analytics, saved listings
- [ ] Advanced trust and intelligence — AI timeline/dispute assistants, listing quality scoring, fraud risk signals
- [ ] Scale — real payment provider, multi-currency, payouts, webhooks/public API, reconciliation dashboards
- [ ] Platform hardening — deployment pipeline, staging, observability, security hardening

## Risks

- Over-documenting before product direction is clear.
- Letting the intentional UI deferral become open-ended backend scaffolding; keep work tied to UC-001 and the trust-loop use cases (UC-004, UC-005).
- Adding payment complexity before simulated flows prove the model.
- Building Phase 5 or releasing on top of the Phase 4 money model before the deferred Backend reliability block closes the failure windows ADR-009 documents.
- Letting AI generate process artifacts that are not actively used.

## Notes

- Product hub: `docs/product/README.md`
- Product discovery: `docs/product/discovery.md`
- MVP definition: `docs/product/mvp-scope.md`
- How we work: `AGENTS.md`
- Product decisions: `docs/product/decisions/` · Architecture decisions: `docs/decisions/`
