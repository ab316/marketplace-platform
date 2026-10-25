# Project State

Current status, recent milestones, and active risks. Keep the latest 5–10 meaningful completed items, newest first, and prune older entries. Detailed implementation and tooling history belong in git; routine housekeeping needs no entry.

## Status

- Solo-founder repository in initial development, with no releases or other users' clones to support.
- The UC-001 backend slice is implemented: a seller organization can publish a refurbished-laptop listing, a buyer can discover it and place a single-unit SEK order, and the order API returns `Awaiting payment` with a timeline. Exercisable over HTTP; see [the API guide](../apps/backend/src/api/README.md).
- Identity and access control (UC-002/UC-003) is implemented: real email/password accounts, opaque sessions, self-serve seller organizations with owner/manager/viewer roles, and a platform-admin role with cross-organization inspection and organization deactivation. The `x-actor-id` stub is gone.
- No frontend yet: `apps/web` is still a placeholder.
- Shared AI instructions and optional role skills are available through [AGENTS.md](../AGENTS.md).

## Current Focus

Phase 2 (Identity and Access Control) is complete and the integration suite now runs on real Postgres. The outstanding Phase 1 work is the cross-module transaction boundary ADR-007 left open — a shared unit of work for order creation, cancellation, expiry, stock changes, and timeline persistence — followed by the destructive Postgres tests that prove it.

Order-lifecycle idempotency follows in Phase 3, simulated payment/escrow in Phase 4, fulfillment, release, and operator inspection in Phase 5. UX, Next.js, and generated OpenAPI/client delivery are deferred to Phase 6. See [the roadmap](product/roadmap.md).

## Recent Completed

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

- The destructive Postgres tests (mid-transaction failure, last-unit contention, cancellation racing expiry, concurrent sweeps) are not written yet; they wait on the ADR-007 transaction-boundary work.
- Reserving a unit and writing the order are separate writes with no shared transaction; `CreateOrder` compensates on failure. Cancellation and expiry also save the order before releasing stock; a release failure can leave stock reserved, and an already-cancelled order will no longer be selected by the expiry sweep. A cross-module transaction boundary still needs the decision ADR-007 left open.
- `apps/web` is a placeholder TypeScript package; Next.js is the intended direction.
- No integration events, outbox, or messaging yet; `OrderPlaced.v1` is planned for Phase 4.
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

See [the ADR index](decisions/README.md) for rationale. No release is scheduled.
