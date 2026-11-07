# Roadmap

What is scheduled, in what order, and why. This is the durable baseline agents read when shaping work.

**Current focus (reordered 2026-11-01):** the web app catches up with the backend. Phases 1–4 built UC-001 through UC-004 as an API; only sign-in/sign-up (UC-002) and the catalogue (UC-006) have a web surface. Phase 6 is now the active phase: **no new backend behavior until everything the backend already does can be done in the browser** — seller organization setup and members, listing publication, listing detail and ordering, payment, the order timeline, and operator inspection. The "Backend reliability" block (transaction boundary, outbox, idempotency keys, correlation IDs, destructive tests) follows, and still gates Phase 5 and any release; it is deferred, not dropped. The niche is chosen ([PD-0002](decisions/0002-refurbished-computers.md)); the trust-centered product model and MVP boundary remain defined by [PD-0001](decisions/0001-product-direction.md) and [`mvp-scope.md`](mvp-scope.md).

How this file works (full rules in [`product-operating-model.md`](product-operating-model.md#backlog-roadmap-and-what-is-built)):

- Product work is picked from the [backlog](product-backlog.md) and listed here by backlog ID; the item's acceptance criteria stay in the backlog and its settled behavior in the use case. Engineering-only work has no backlog item and is listed here directly.
- A phase names its goal, the gates to settle before code (use case, PD, ADR), the backlog items and engineering work it covers, and a success metric.
- When a phase is finished, it shrinks to one line under [Done](#done). What the product does is recorded in the [use-case index](use-cases/README.md); details live in git and the changelog.
- Outcome-driven. Keep dates out until there is real delivery cadence.

## Now

- [ ] Phase 6 - Web Workflow for Everything That Exists
  - Goal:
    - Every behavior the backend implements (UC-001, UC-002, UC-003, UC-004, UC-006) is usable in the browser by the role it belongs to — buyer, seller, operator — so the product can be demoed and judged as a product, not an API
  - Rule for this phase:
    - No new backend behavior. Backend changes are allowed only where the web slice exposes a defect or a gap in behavior the backend claims to implement (e.g. an authorization rule a use case states but the API does not enforce)
    - Recorded exception (2026-11-07): seller listing management carries two backend changes, P1-012 incomplete drafts and P1-017 brand from the curated list (both done 2026-11-07), because its web form is designed around them ([spec](feature-specs/seller-listing-management.md), "Changes to current behavior")
  - Shaping (gates settled ahead of the phase):
    - [x] ADR-010 — frontend stack (Next.js App Router, Tailwind + shadcn/ui, TanStack Query, Vitest/RTL/MSW, Playwright)
    - [x] ADR-011 — cookie session transport and the Next.js BFF boundary, closing the transport question ADR-008 left open
    - [x] ADR-012 — federated sign-in readiness, so social login stays additive
    - [x] ADR-013 — thin async pages, so every page state is component-testable
    - Each web slice captures its design input under `docs/design/` before implementation (mockup round optional; the auth pages and catalogue set the pattern)
  - Deliverables, in suggested order (each is one PR-sized slice with its own design contract and tests):
    - [x] Next.js frontend scaffolded in `apps/web` per ADR-010: route groups, data layer, design tokens, test setup, and sample pages only
    - [x] Cookie-backed sign-in, sign-up, and sign-out per ADR-011 (UC-002)
    - [x] Buyer catalogue with URL-driven refinements at `/listings` (UC-006)
    - [x] Seller organization creation and seller home (UC-003 C1–C3): `/seller/setup` and `/seller`, the first protected `/seller` route group. Design contract in `docs/design/seller-organization-setup.md`
    - [x] Seller listing management ([spec](feature-specs/seller-listing-management.md); UC-005, UC-007–UC-010, approved 2026-11-07): create and edit incomplete drafts, publish, archive, the organization's listing list. Backlog items P1-012 and P1-017 (backend changes, see the exception above). Shipped 2026-11-07 on API and web; design contract `docs/design/seller-listing-management.md`. Discarding a draft (UC-011, P1-018) is settled but not scheduled
    - [ ] Buyer listing detail and order placement (UC-001 B2–B4; closes [#15](https://github.com/ab316/marketplace-platform/issues/15)), the buyer's order list, and cancellation of an unpaid order
    - [ ] Buyer payment into escrow through the simulated provider (UC-004), with the order page showing the timeline entries that exist today (the shipped part of P0-012)
    - [ ] Seller organization members and profile (UC-003 M1–M4): add, change role, remove; audit history
    - [ ] Operator surface (UC-003 A1–A3, UC-004 admin reads): organization list, deactivate/reactivate with reason, open any order with its timeline, payment attempts, and financial history. Needs the admin-provisioning command from Refinements to be demoable without SQL
    - [ ] Shared API contracts consumed by both apps (ongoing; already the pattern)
    - [ ] Focused frontend tests per slice and one critical browser-to-backend journey per role
  - Success metric:
    - A seller signs up, creates an organization, publishes a listing; a buyer finds it, orders, and pays into escrow; an operator inspects the order — all through the web UI against the real backend, in one demo

- [ ] Refinements (interleave between slices; not blocking; the backend ones only when a web slice needs them)
  - Backlog items: P1-011 restock an active listing, P1-013 repeated cancellation (P1-012 moved into Phase 6 seller listing management on 2026-11-07)
  - Done: P1-010 steerable catalogue — [UC-006](use-cases/UC-006-buyer-searches-the-catalogue.md) implemented 2026-10-31 (API filters/sort + the `/listings` page); later slices stay unscheduled: P1-015 refinement counts, P1-016 match quality (P1-017 publish-time brand vocabulary moved into Phase 6 seller listing management on 2026-11-07)
  - Engineering:
    - [x] Catalogue excludes listings with no available units (UC-006 Q1; closes bug #14 when merged)
    - [ ] Command to provision platform admins, replacing manual SQL (needed by the operator web slice)
    - [ ] Catalogue hides deactivated sellers without the current 1000-organization cap
    - [ ] Contract tests for shared API response shapes

## Next

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

- [ ] Phase 5 - Fulfillment, Release, and Inspection (backend and web together — no more API-only phases)
  - Goal:
    - Complete the MVP trust loop end to end, API and web in the same phase: pay → fulfill → confirm → release → inspect
  - Shaping (gate before code):
    - [ ] Use cases for seller fulfillment, buyer confirmation, and fund release, including seller settlement status (numbered when written; expect several, one goal each)
    - [ ] Design contracts under `docs/design/` for the seller fulfillment actions, the buyer confirmation step, and the operator order list
  - Backlog items:
    - P0-008 – P0-011: start fulfillment, fulfillment updates, submit for confirmation, confirm and release (escrow to seller balance minus the frozen fee, atomic and idempotent)
    - P0-012: fulfillment, completion, and release timeline entries
    - P0-013: operator order list and search, status and stuck-order filters, fulfillment state
    - P0-014, P0-015: buyer and seller dashboards
    - P1-006 (MVP subset): released amount, fee, and settlement status per order
  - Engineering:
    - [ ] Authorization matrix extended to the new actions
    - [ ] Backend workflow test of the full loop with balanced-ledger assertions
    - [ ] Browser-to-backend journey of the full loop
  - Success metric:
    - A buyer and seller complete one trusted order — order, pay, fulfill, confirm, release — through the web UI, with a balanced ledger and a complete timeline an operator can inspect

Suggested order: Phase 6 → Backend reliability → Phase 5. Refinements fill gaps between slices.

## Later

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
- Letting web work drift into new backend behavior; Phase 6 exposes what exists, and anything the web needs that the API lacks is a recorded gap, not a quiet addition.
- Demoing the money model through the web and forgetting that the "Backend reliability" block has not closed; the web UI makes the product look releasable before it is.
- Adding payment complexity before simulated flows prove the model.
- Building Phase 5 or releasing on top of the Phase 4 money model before the deferred Backend reliability block closes the failure windows ADR-009 documents.
- Letting AI generate process artifacts that are not actively used.

## Notes

- Product hub: `docs/product/README.md`
- Product discovery: `docs/product/discovery.md`
- MVP definition: `docs/product/mvp-scope.md`
- How we work: `AGENTS.md`
- Product decisions: `docs/product/decisions/` · Architecture decisions: `docs/decisions/`
