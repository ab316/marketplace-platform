# Roadmap

What is scheduled, in what order, and why. This is the durable baseline agents read when shaping work.

**Current focus:** Phase 4 — the simulated escrow payment and double-entry ledger for [UC-004](use-cases/UC-004-buyer-pays-into-escrow.md) — is built, under the policy in [PD-0004](decisions/0004-escrow-fee-and-payment-policy.md) and the module layout in ADR-009. Next is the "Backend reliability" block: the durability work (transaction boundary, outbox, idempotency keys, correlation IDs, destructive tests) deliberately deferred from Phases 1, 3, and 4, which must close before Phase 5 builds on the money model or anything is released. After that: fulfillment, release, and inspection (Phase 5), then UI work in Phase 6. The niche is chosen ([PD-0002](decisions/0002-refurbished-computers.md)); the trust-centered product model and MVP boundary remain defined by [PD-0001](decisions/0001-product-direction.md) and [`mvp-scope.md`](mvp-scope.md).

How this file works (full rules in [`product-operating-model.md`](product-operating-model.md#backlog-roadmap-and-what-is-built)):

- Product work is picked from the [backlog](product-backlog.md) and listed here by backlog ID; the item's acceptance criteria stay in the backlog and its settled behavior in the use case. Engineering-only work has no backlog item and is listed here directly.
- A phase names its goal, the gates to settle before code (use case, PD, ADR), the backlog items and engineering work it covers, and a success metric.
- When a phase is finished, it shrinks to one line under [Done](#done). What the product does is recorded in the [use-case index](use-cases/README.md); details live in git and the changelog.
- Outcome-driven. Keep dates out until there is real delivery cadence.

## Now

- [ ] Backend reliability (engineering; deferred from Phases 1, 3, and 4; required before Phase 5 and before any release)
  - [ ] ADR deciding the unit-of-work / transaction boundary ADR-007 left open, covering the cross-module stock reservation and the payment-result writes ordered in ADR-009
  - [ ] Atomic persistence for order creation, cancellation, expiry, and the payment success path (ledger posting, order status, unit sold); remove the compensating release from order creation
  - [ ] Transactional outbox with a relay (in-process first; NATS JetStream per ADR-004 behind a port) and idempotent consumers; register `OrderPlaced.v1`, `OrderPaid.v1`, and friends in `EVENT_CATALOG.md` before producer code
  - [ ] Durable, reusable `Idempotency-Key` handling for order creation and payment start: the same key and body replays the original response; the same key with a different body is rejected
  - [ ] Expiry and timeout sweeps safe when several backend instances run them at once (ADR-005)
  - [ ] Correlation ID on every request and job, carried into structured logs (ENGINEERING_STANDARDS §6)
  - [ ] Destructive tests on Postgres: injected mid-transaction failure rolls back, last-unit contention, cancellation racing expiry, concurrent sweeps, parallel identical requests, key reuse with a different body, crash between payment writes — no leaked stock, no unpaid order with funded escrow
  - Success metric:
    - The HTTP workflow preserves stock, order state, money, and audit history under real database failures, retries, and concurrency

## Next

- [ ] Phase 5 - Fulfillment, Release, and Inspection
  - Goal:
    - Complete the MVP trust loop end to end on the backend: pay → fulfill → confirm → release → inspect
  - Shaping (gate before code):
    - [ ] UC-005: seller fulfills, buyer confirms, funds release, including seller settlement status
  - Backlog items:
    - P0-008 – P0-011: start fulfillment, fulfillment updates, submit for confirmation, confirm and release (escrow to seller balance minus the frozen fee, atomic and idempotent)
    - P0-012: fulfillment, completion, and release timeline entries
    - P0-013: operator order list and search, status and stuck-order filters, fulfillment state
    - P0-014, P0-015: buyer and seller dashboards
    - P1-006 (MVP subset): released amount, fee, and settlement status per order
  - Engineering:
    - [ ] Authorization matrix extended to the new actions
    - [ ] Backend workflow test of the full loop with balanced-ledger assertions
  - Success metric:
    - A buyer and seller complete one trusted order — order, pay, fulfill, confirm, release — through the API, with a balanced ledger and a complete timeline an operator can inspect

- [ ] Refinements (interleave between phases; not blocking)
  - Backlog items: P1-010 browse filters and sorting, P1-011 restock an active listing, P1-012 incomplete listing drafts, P1-013 repeated cancellation
  - Engineering:
    - [ ] Catalogue hides deactivated sellers without the current 1000-organization cap
    - [ ] Command to provision platform admins, replacing manual SQL
    - [ ] Contract tests for shared API response shapes

Suggested order: Backend reliability → Phase 5. Refinements fill gaps between phases.

## Later

- [ ] Phase 6 - Web Workflow and API Client
  - Goal:
    - Expose the implemented marketplace workflow through a usable web demo
  - Deliverables:
    - Rough UX direction and feature design input under `docs/design/`, with Figma used if needed
    - Next.js frontend initialized in `apps/web`
    - Shared API contracts consumed by both apps
    - Automatically generated OpenAPI specification and typed frontend client, with a generation command and CI drift check (see [Tech Stack](../TECH_STACK.md#planned-generated-openapi-and-frontend-client))
    - Seller listing publication, buyer discovery/ordering/payment, fulfillment and confirmation, and order timeline/actions connected to the backend (UC-001, UC-004, UC-005)
    - Focused frontend tests and a critical browser-to-backend workflow test
  - Success metric:
    - The product can be demoed locally through the web UI

- [ ] Recovery and trust workflows — notification infrastructure first (P1-007, which unblocks P1-008 email verification and P1-009 password reset), then full refunds (P1-002/P1-003) before basic disputes (P1-004/P1-005)
- [ ] Platform hardening (engineering) — deployment pipeline, staging, observability, security hardening

Everything else waits in the [backlog](product-backlog.md) until it is scheduled here.

## Done

- Repository bootstrap — monorepo scaffold, initial backend architecture docs, AI role/workflow docs.
- Phase 0 - Product Direction — trust-centered product model ([PD-0001](decisions/0001-product-direction.md)), MVP scope, refurbished-computers niche ([PD-0002](decisions/0002-refurbished-computers.md)), first use case approved ([UC-001](use-cases/UC-001-buyer-orders-refurbished-laptop.md)).
- Phase 1 - Marketplace Backend — UC-001 over HTTP on real Postgres, with Testcontainers-backed integration suites and an automated migration test. Its reliability work moved to "Backend reliability".
- Phase 2 - Identity and Access Control — accounts, sessions, seller organizations, fixed roles, platform admin ([PD-0003](decisions/0003-identity-and-organization-access.md), ADR-008, [UC-002](use-cases/UC-002-user-signs-up-and-signs-in.md), [UC-003](use-cases/UC-003-seller-organization-and-member-management.md)).
- Phase 3 - Order Lifecycle — orders as state machines from awaiting payment to cancelled, with history on the order API. Idempotency and retry tests moved to "Backend reliability"; repeated cancellation to P1-013.
- Phase 4 - Simulated Escrow Payment and Ledger — double-entry ledger, simulated provider, payment attempts and hold, paid-into-escrow orders ([PD-0004](decisions/0004-escrow-fee-and-payment-policy.md), ADR-009, [UC-004](use-cases/UC-004-buyer-pays-into-escrow.md)). Atomic writes and the outbox moved to "Backend reliability".

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
