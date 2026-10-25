# Project State

Current status, recent milestones, and active risks. Keep the latest 5–10 meaningful completed items, newest first, and prune older entries. Detailed implementation and tooling history belong in git; routine housekeeping needs no entry.

## Status

- Solo-founder repository in initial development, with no releases or other users' clones to support.
- The UC-001 backend slice is implemented: a seller organization can publish a refurbished-laptop listing, a buyer can discover it and place a single-unit SEK order, and the order API returns `Awaiting payment` with a timeline. Exercisable over HTTP; see [the API guide](../apps/backend/src/api/README.md).
- Identity and access control (UC-002/UC-003) is implemented: real email/password accounts, opaque sessions, self-serve seller organizations with owner/manager/viewer roles, and a platform-admin role with cross-organization inspection and organization deactivation. The `x-actor-id` stub is gone.
- Simulated escrow payment and the double-entry ledger (UC-004, Phase 4) are implemented: a buyer pays an order through a simulated provider, the money is held in a per-order escrow account in an append-only journal enforced by Postgres, the order becomes `paid_into_escrow` with the 8% fee rate frozen, and the unit becomes sold. Failure, timeout, duplicate callback, and late payment for a dead order all leave money and order state consistent. Platform admins read attempts and financial history per order.
- No frontend yet: `apps/web` is still a placeholder.
- Shared AI instructions and optional role skills are available through [AGENTS.md](../AGENTS.md).

## Current Focus

Phase 4 (simulated escrow payment and ledger) is built. The durability work it deliberately skipped — the cross-module transaction boundary ADR-007 left open, the transactional outbox, durable `Idempotency-Key` handling, correlation IDs, and the destructive Postgres tests — is collected in the roadmap's "Backend reliability" block and is the next work: ADR-009 documents the failure windows the ordered-but-separate payment writes leave open, and Phase 5 must not build on the money model before they close.

Then fulfillment, release (charging the frozen fee), and operator inspection in Phase 5. UX, Next.js, and generated OpenAPI/client delivery are deferred to Phase 6. See [the roadmap](product/roadmap.md).

## Recent Completed

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
- Defined frontend architecture principles and design intake for the first visible product slice.

## Active Risks and Gaps

- **Payment writes are ordered but not atomic (ADR-009 §3).** On a successful payment the ledger posting, the order status change, the unit-sold conversion, and the attempt status are separate commits. A crash between them leaves escrow funded with the order still unpaid (never the reverse) until the provider redelivers the callback or the timeout sweep settles the captured attempt. Order status and unit-sold are likewise two aggregates: a crash between them leaves a paid order with a reserved rather than sold unit until `MarkOrderPaid` is replayed. Both close with the unit-of-work ADR in the "Backend reliability" block.
- No `Idempotency-Key` on payment start; the one-pending-attempt-per-order index is the only guard against concurrent starts. A retried start after a failure legitimately creates a new attempt.
- The `scenario` field on `POST /api/orders/:orderId/pay` is a simulated-provider affordance on a public route; it must go when a real provider arrives (PD-0004 §9).
- The payment-timeout and reservation-expiry sweeps are single-process safe only; running several backend instances can double-run them (ADR-005, deferred).
- An unfulfillable paid order has no self-serve path until the recovery workflows (P1-002/P1-003); operators resolve it out of band (PD-0004 §6).
- The destructive Postgres tests (mid-transaction failure, last-unit contention, cancellation racing expiry, concurrent sweeps, crash between payment writes) are not written yet; they wait on the transaction-boundary work.
- Reserving a unit and writing the order are separate writes with no shared transaction; `CreateOrder` compensates on failure. Cancellation and expiry also save the order before releasing stock; a release failure can leave stock reserved, and an already-cancelled order will no longer be selected by the expiry sweep. A cross-module transaction boundary still needs the decision ADR-007 left open.
- `apps/web` is a placeholder TypeScript package; Next.js is the intended direction.
- No integration events, outbox, or messaging yet; `OrderPlaced.v1` and `OrderPaid.v1` wait for the outbox in the "Backend reliability" block.
- The generated OpenAPI specification and typed frontend client are deferred Phase 6 deliverables.
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
