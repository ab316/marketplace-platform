# Roadmap

The roadmap: what we're building, what's next, and why. This is the durable baseline agents read when shaping work.

**Current focus:** Phase 1 — make order creation, cancellation, and expiry atomic for [UC-001](use-cases/UC-001-buyer-orders-refurbished-laptop.md). Postgres execution is now verified (migrations apply, roll back, and re-apply; the full workflow runs against a real database), so the remaining work is the cross-module transaction boundary ADR-007 left open. The HTTP workflow is implemented; UI work is deferred to Phase 5, after backend identity, lifecycle, and simulated payment work. The niche is chosen ([PD-0002](decisions/0002-refurbished-computers.md)); the trust-centered product model and MVP boundary remain defined by [PD-0001](decisions/0001-product-direction.md) and [`mvp-scope.md`](mvp-scope.md).

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
    - [x] Postgres repositories and migration written; execution remains unverified
  - Remaining deliverables (next work):
    - [ ] Verify migrations and run API integration tests against real Postgres locally and in CI
    - [ ] Decide and document the cross-module transaction boundary left open by ADR-007
    - [ ] Atomically persist reservation + order + timeline, and cancellation/expiry + stock release
    - [ ] Prove rollback, last-unit contention, and concurrent cancellation/expiry without leaked or double-released stock
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
    - [ ] Durable order-creation idempotency and defined repeat-cancellation behavior, with retry/concurrency tests
  - Success metric:
    - Order state changes are explicit, tested, and visible

- [ ] Phase 4 - Simulated Escrow Payment and Ledger
  - Goal:
    - Prove financial correctness without external payment-provider complexity
  - Deliverables:
    - fake payment provider boundary
    - escrow hold / release / refund simulation
    - double-entry ledger model
    - transactional outbox for integration events
    - destructive tests for retries, duplicates, and concurrency
  - Success metric:
    - Financial flows remain correct under failure simulation

Phases 1–4 establish the backend foundation for the MVP trust loop. A visible product demo follows in Phase 5; full product scope remains defined by `mvp-scope.md`.

## Later

- [ ] Phase 5 - Web Workflow and API Client
  - Goal:
    - Expose the implemented marketplace workflow through a usable web demo
  - Deliverables:
    - Rough UX direction and feature design input under `docs/design/`, with Figma used if needed
    - Next.js frontend initialized in `apps/web`
    - Shared API contracts consumed by both apps
    - Automatically generated OpenAPI specification and typed frontend client, with a generation command and CI drift check (see [Tech Stack](../TECH_STACK.md#planned-generated-openapi-and-frontend-client))
    - Seller listing publication, buyer discovery/ordering, and order timeline/actions connected to the backend
    - Focused frontend tests and a critical browser-to-backend workflow test
  - Success metric:
    - The product can be demoed locally through the web UI

Product-level phasing (details in `feature-catalog.md` and `product-backlog.md`):

- [ ] Recovery and trust workflows — refund requests, basic disputes, operator dashboard, settlement visibility, notifications
- [ ] Experience improvements — offers/negotiation, listing quality guidance, search/filters, seller analytics, saved listings
- [ ] Advanced trust and intelligence — AI timeline/dispute assistants, listing quality scoring, fraud risk signals
- [ ] Scale — real payment provider, multi-currency, payouts, webhooks/public API, reconciliation dashboards
- [ ] Platform hardening — deployment pipeline, staging, observability, security hardening

## Risks

- Over-documenting before product direction is clear.
- Letting the intentional UI deferral become open-ended backend scaffolding; keep work tied to UC-001 and the next payment use case.
- Adding payment complexity before simulated flows prove the model.
- Letting AI generate process artifacts that are not actively used.

## Notes

- Product hub: `docs/product/README.md`
- Product discovery: `docs/product/discovery.md`
- MVP definition: `docs/product/mvp-scope.md`
- How we work: `AGENTS.md`
- Product decisions: `docs/product/decisions/` · Architecture decisions: `docs/decisions/`
