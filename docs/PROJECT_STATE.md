# Project State

Current status, recent milestones, and active risks. Keep the latest 5–10 meaningful completed items, newest first, and prune older entries. Detailed implementation and tooling history belong in git; routine housekeeping needs no entry.

## Status

- Solo-founder repository in initial development, with no releases or other users' clones to support.
- The UC-001 backend slice is implemented: a seller organization can publish a refurbished-laptop listing, a buyer can discover it and place a single-unit SEK order, and the order API returns `Awaiting payment` with a timeline. Exercisable over HTTP; see [the API guide](../apps/backend/src/api/README.md).
- Identity and access control (UC-002/UC-003) is implemented: real email/password accounts, opaque sessions, self-serve seller organizations with owner/manager/viewer roles, and a platform-admin role with cross-organization inspection and organization deactivation. The `x-actor-id` stub is gone.
- Simulated escrow payment and the double-entry ledger (UC-004, Phase 4) are implemented: a buyer pays an order through a simulated provider, the money is held in a per-order escrow account in an append-only journal enforced by Postgres, the order becomes `paid_into_escrow` with the 8% fee rate frozen, and the unit becomes sold. Failure, timeout, duplicate callback, and late payment for a dead order all leave money and order state consistent. Platform admins read attempts and financial history per order.
- The web app covers the catalogue, the buyer's listing page, sign-in/sign-up, and the seller's organization and listings: `apps/web` runs Next.js 16 (App Router, Server Components by default) on the design system, typed data layer, cookie auth transport, and the Vitest/Playwright suites. The stack is fixed by ADR-010, the session transport by ADR-011. A buyer cannot yet order anything in the browser.
- Shared AI instructions and optional role skills are available through [AGENTS.md](../AGENTS.md).

## Current Focus

Reordered on 2026-11-01: **the web app catches up with the backend before any new backend behavior is built.** Phases 1–4 delivered UC-001 through UC-004 API-first; only sign-in/sign-up (UC-002) and the catalogue (UC-006) have a web surface. Phase 6 is now active, as ordered web slices: seller organization creation and home (design approved in `docs/design/seller-organization-setup.md`), seller listing management, buyer listing detail and ordering (#15), payment and the order timeline, organization members, and the operator surface. The use-case index now tracks API and Web surfaces separately so API-only delivery reads as a gap.

Buyer listing detail shipped on 2026-11-07 (UC-012): `/listings/[listingId]`, catalogue cards as links, the sold-out and archived states, and the seller's name on buyer-facing listing responses (P1-020's listing half), closing [#15](https://github.com/ab316/marketplace-platform/issues/15). **The next slice is buyer ordering** — confirm-then-order, the order page without payment, cancellation, and `/orders` (UC-001, UC-013, UC-014) — which also finishes P1-020 (the order response) and enforces P1-021. Until it lands, the listing page says ordering opens with the next release where its action belongs.

Seller listing management shipped on API and web (2026-11-07): UC-005 and UC-007–UC-010 are implemented on both surfaces, including incomplete drafts (P1-012) and brand from the curated list (P1-017) — a recorded exception to Phase 6's no-new-backend rule. UC-011 (discard a draft) is settled but not scheduled. Use-case numbers are no longer reserved ahead of shaping.

The buyer's side is now shaped (2026-11-07, decisions D1–D8) and splits into two specs and two slices: [discovery](product/feature-specs/buyer-discovery.md) (inspecting a listing, the area that grows into seller profiles, photos, and saved listings) and [ordering](product/feature-specs/buyer-ordering.md) (the commitment). **Next: buyer listing detail** — `/listings/[id]`, catalogue cards as links, and the sold-out and archived states ([UC-012](product/use-cases/UC-012-buyer-views-listing-details.md), Approved; design contract `docs/design/buyer-listing-detail.md`), closing [#15](https://github.com/ab316/marketplace-platform/issues/15). Then order placement, cancellation, and the buyer's orders (UC-001, [UC-013](product/use-cases/UC-013-buyer-cancels-unpaid-order.md), and [UC-014](product/use-cases/UC-014-buyer-reviews-their-orders.md), which is Draft and refined before that slice). Shaping split UC-001 by goal, the way the seller side was split, and recorded two more Phase 6 exceptions: **P1-020**, the seller's name on buyer-facing listing and order responses (buyers currently cannot see who they are buying from), and **P1-021**, refusing orders from the selling organization's own members and from platform admins.

The "Backend reliability" block (transaction boundary, outbox, idempotency keys, correlation IDs, destructive Postgres tests) follows Phase 6 and still gates Phase 5 and any release; ADR-009 documents the failure windows it closes. Phase 5 (fulfillment, release, inspection) is then built on both surfaces in one phase. See [the roadmap](product/roadmap.md).

## Recent Completed

- Shipped seller listing management in the web app (UC-005, UC-007–UC-010): `/seller/listings` with stock and draft readiness, a draft editor that saves incomplete drafts and shows the server's readiness, publish and archive behind confirmations, and an "Overview · Listings" seller sub-navigation. Brand is now chosen from the curated list on the API (P1-017, with a one-pass capitalization migration). A Playwright journey covers draft → publish → catalogue → archive.
- Implemented incomplete listing drafts on the API (P1-012): drafts save any subset of fields and report their readiness, edits merge and can clear fields, and publishing lists every gap at once. Disclosure columns are nullable behind two new database rules (published rows complete, drafts hold no stock). The listing contract now splits published listings (`listingSchema`) from drafts (`listingDraftSchema`); the catalogue and order snapshots only ever see complete listings.
- Implemented catalogue search end to end (UC-006, P1-010): `GET /api/listings` gains brand (curated list, case-insensitive), price-range, minimum-grade, and minimum-memory filters, explicit sorts with deterministic tiebreaks, and now returns only listings with available stock (bug #14); `/listings` in `apps/web` is the first marketplace page — a thin async shell per ADR-013 over synchronous, component-tested views, with URL-held refinements, GET-form filters that work without JavaScript, and a Playwright journey through the real stack.
- Implemented simulated escrow payment and the ledger (roadmap Phase 4; UC-004, PD-0004, ADR-009): `ledger` module with a Postgres-enforced append-only, balanced journal and rebuildable balances (property-tested); `payments` module with payment attempts, a 15-minute payment hold, a simulated provider behind a port and a signed, deduplicated webhook, ordered idempotent writes (ledger → order → attempt) that converge on retry, and a timeout sweep that also recovers a captured-but-unapplied payment; orders gain `paid_into_escrow`, a frozen fee rate, and payment timeline entries; listings gain a sold counter. Money arithmetic with round-half-up basis points. Full UC-004 coverage over HTTP, including duplicate, late, forged, and concurrent cases.
- Shaped Phase 4: PD-0004 (8% seller-borne fee frozen at payment, 15-minute payment hold, late payments returned and never reviving an order, sold units, no auto-release, simulated provider with an explicit scenario field), UC-004, the escrow-payment feature spec, and ADR-009 (payments and ledger modules, provider boundary, payment write ordering). Deferred the durability work into a named "Backend reliability" roadmap block.
- Ran the API and application integration suites against real Postgres: a Testcontainers-managed `postgres:18-alpine` per run, the real migrations applied to a template database, one cloned database per test file, and truncation between tests. Postgres is the default locally and in CI; `TEST_PERSISTENCE=memory` keeps a Docker-free fast loop. A persistence test applies, fully reverts, and re-applies every migration on a fresh database, replacing the manual up/down/up check.
- Implemented identity and access control (roadmap Phase 2): the `identity` module with accounts, opaque server-side sessions (ADR-008), self-serve seller organizations, fixed owner/manager/viewer roles, a platform-admin role, deactivate-only organization lifecycle, and an append-only organization audit trail. Replaced the `x-actor-id` stub everywhere and added an exhaustive route × role authorization matrix test.
- Verified Postgres execution for the first time: migrations apply, roll back, and re-apply cleanly, and the full sign-up → organization → listing → order → admin-inspection workflow runs against a real database.
- Implemented the UC-001 backend: `listings` and `orders` modules, Fastify API, hand-written Postgres schema and migration, and domain/API/application tests using in-memory persistence, including cancellation and automated reservation expiry.
- Approved UC-001 as the first stable use case: laptops only, pooled-stock listings, immediate single-unit orders in SEK, 24-hour unpaid reservation expiry.
- Chose refurbished computers as the marketplace niche, with shipment, delivery, and device lifecycle workflows as expansion opportunities (PD-0002).
- Updated the shared AI workflow to repository skills for Claude Code, Codex, and Gemini.
- Defined the interface-first testing strategy, with API/workflow integration and direct checks for critical invariants.
- Established the trust-centered product direction, MVP scope, and roadmap in `docs/product/`.
- Consolidated the working guide and engineering standards, with optional roles and stronger checks for money/concurrency/event work.
- Scaffolded the Next.js web application (roadmap Phase 6): App Router with Server Components by default, Tailwind v4 design tokens with light/dark themes, Radix-based UI primitives, a typed server-only data layer that is the single path to the backend, cookie session transport, and the Vitest/RTL/MSW and Playwright suites. Sample pages only.
- Settled the frontend decisions: ADR-010 (stack; shared Zod contracts instead of a generated client), ADR-011 (httpOnly cookie to Next.js, Bearer header to the backend; Next.js never an authority), ADR-012 (federated sign-in readiness and account-linking rules).
- Defined frontend architecture principles and design intake for the first visible product slice.

## Active Risks and Gaps

- **Payment writes are ordered but not atomic (ADR-009 §3).** On a successful payment the ledger posting, the order status change, the unit-sold conversion, and the attempt status are separate commits. A crash between them leaves escrow funded with the order still unpaid (never the reverse) until the provider redelivers the callback or the timeout sweep settles the captured attempt. Order status and unit-sold are likewise two aggregates: a crash between them leaves a paid order with a reserved rather than sold unit until `MarkOrderPaid` is replayed. Both close with the unit-of-work ADR in the "Backend reliability" block.
- No `Idempotency-Key` on payment start; the one-pending-attempt-per-order index is the only guard against concurrent starts. A retried start after a failure legitimately creates a new attempt.
- The `scenario` field on `POST /api/orders/:orderId/pay` is a simulated-provider affordance on a public route; it must go when a real provider arrives (PD-0004 §9).
- The payment-timeout and reservation-expiry sweeps are single-process safe only; running several backend instances can double-run them (ADR-005, deferred).
- An unfulfillable paid order has no self-serve path until the recovery workflows (P1-002/P1-003); operators resolve it out of band (PD-0004 §6).
- The destructive Postgres tests (mid-transaction failure, last-unit contention, cancellation racing expiry, concurrent sweeps, crash between payment writes) are not written yet; they wait on the transaction-boundary work.
- Reserving a unit and writing the order are separate writes with no shared transaction; `CreateOrder` compensates on failure. Cancellation and expiry also save the order before releasing stock; a release failure can leave stock reserved, and an already-cancelled order will no longer be selected by the expiry sweep. A cross-module transaction boundary still needs the decision ADR-007 left open.
- **No mobile design exists for any surface.** Every mockup and built page is desktop-only; responsive breakpoints in the code are implementer defaults, not design decisions. Needs a product-wide mobile pass (header, footer, auth pages, catalogue filter rail) rather than page-by-page invention — see the open question in `docs/design/catalogue-search.md`.
- No buyer can order in the browser: `/listings/[id]` shows the order action as not yet open, and there is no order page or `/orders`. The next Phase 6 slice.
- **An order still does not say who the seller is.** Listings now carry `seller: { organizationId, name }` on the catalogue and listing-detail routes (P1-020, 2026-11-07), but the order response has only an organization id, so the order page cannot name the counterparty. The rest of P1-020 ships with the ordering slice.
- **Any signed-in user can order anything,** including a member ordering their own organization's listing and a platform admin ordering as a buyer. Settled 2026-11-07 as a rule (business rules, "who may order"); enforcement is P1-021, built with the ordering slice.
- A buyer can hold several unpaid orders on one listing and tie up its stock for 24 hours each. Deliberate for now (P1-022); nothing oversells, because each order reserves its own unit.
- Async Server Components are not component-testable; ADR-013 confines them to thin composition shells (the catalogue and listing pages are the examples) so everything below the async boundary tests in Vitest, with Playwright owning only the genuinely server-bound paths.
- The Playwright suite is green run serially, as CI runs it; run locally in parallel, the seller-organization journey is flaky against a shared database. Pre-existing, and the reason the config serializes CI.
- No integration events, outbox, or messaging yet; `OrderPlaced.v1` and `OrderPaid.v1` wait for the outbox in the "Backend reliability" block.
- The generated typed frontend client is no longer planned: the web app imports the shared Zod contracts directly (ADR-010). The backend still publishes OpenAPI for documentation and future external consumers.
- Email verification and password reset are deliberately deferred out of the identity phase (backlog P1-008/P1-009); until they ship, accounts are unverified and lockouts need manual help.
- Marketplace staff are provisioned out of band (`ProvisionPlatformAdmin` or a direct SQL update); there is no seeding command yet.
- `BrowseActiveListings` excludes deactivated sellers via an id list capped at 1000 organizations. Beyond that scale the catalogue needs a join instead.

## Architectural Baseline

These are recorded decisions, not completed product capabilities:

- ADR-001: Modular monolith with explicit bounded contexts and layered architecture.
- ADR-002: Strong consistency for internal changes and outbox-based integration events.
- ADR-003: Append-only financial ledger model.
- ADR-004: NATS JetStream for integration event delivery.
- ADR-005: Stateless horizontal scaling.
- ADR-006: Kysely and node-pg-migrate for persistence and migrations.
- ADR-007: Pure dependency injection with composition roots.
- ADR-008: Opaque server-side sessions for authentication.
- ADR-009: Payments and ledger modules, simulated provider boundary, and ordered payment writes.

See [the ADR index](decisions/README.md) for rationale. No release is scheduled.
