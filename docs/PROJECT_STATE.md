# Project State

Current status, recent milestones, and active risks. Keep the latest 5–10 meaningful completed items, newest first, and prune older entries. Detailed implementation and tooling history belong in git; routine housekeeping needs no entry.

## Status

- Solo-founder repository in initial development, with no releases or other users' clones to support.
- The UC-001 backend slice is implemented: a seller organization can publish a refurbished-laptop listing, a buyer can discover it and place a single-unit SEK order, and the order API returns `Awaiting payment` with a timeline. Exercisable over HTTP; see [the API guide](../apps/backend/src/api/README.md).
- No frontend yet: `apps/web` is still a placeholder.
- Shared AI instructions and optional role skills are available through [AGENTS.md](../AGENTS.md).

## Current Focus

Phase 1 — make the implemented UC-001 backend reliable on Postgres. Next work is real-database integration coverage and a shared transaction boundary for order creation, cancellation, expiry, stock changes, and timeline persistence.

Then complete Phase 2 command idempotency and authorized operator inspection before Phase 3 simulated payment/escrow. UX, Next.js, and generated OpenAPI/client delivery are deferred to Phase 4. See [the roadmap](product/roadmap.md).

## Recent Completed

- Implemented the UC-001 backend: `listings` and `orders` modules, Fastify API, hand-written Postgres schema and migration, and domain/API/application tests using in-memory persistence, including cancellation and automated reservation expiry.
- Approved UC-001 as the first stable use case: laptops only, pooled-stock listings, immediate single-unit orders in SEK, 24-hour unpaid reservation expiry.
- Chose refurbished computers as the marketplace niche, with shipment, delivery, and device lifecycle workflows as expansion opportunities (PD-0002).
- Updated the shared AI workflow to repository skills for Claude Code, Codex, and Gemini.
- Defined the interface-first testing strategy, with API/workflow integration and direct checks for critical invariants.
- Established the trust-centered product direction, MVP scope, and roadmap in `docs/product/`.
- Consolidated the working guide and engineering standards, with optional roles and stronger checks for money/concurrency/event work.
- Defined frontend architecture principles and design intake for the first visible product slice.

## Active Risks and Gaps

- **Postgres execution remains unverified in the recorded project state.** Migrations, `PgListingRepository`, and `PgOrderRepository` are written; the implementation environment lacked Postgres/Docker. Verify `pnpm migrate:up` and a `PERSISTENCE=postgres` run before trusting them.
- Tests run against in-memory repositories, not Postgres, so they prove domain and HTTP behavior but **not** SQL, constraints, or real concurrency. This deviates from `TESTING_STRATEGY.md`, which requires real Postgres for API tests; it was a deliberate scope choice. Testcontainers-backed persistence tests are the fix.
- No authentication: the caller is identified by an `x-actor-id` header matching fixed seed actors. Authorization checks exist but rest on that stub.
- Reserving a unit and writing the order are separate writes with no shared transaction; `CreateOrder` compensates on failure. Cancellation and expiry also save the order before releasing stock; a release failure can leave stock reserved, and an already-cancelled order will no longer be selected by the expiry sweep. A cross-module transaction boundary still needs the decision ADR-007 left open.
- `apps/web` is a placeholder TypeScript package; Next.js is the intended direction.
- No integration events, outbox, or messaging yet; `OrderPlaced.v1` is planned for Phase 3.
- The generated OpenAPI specification and typed frontend client are deferred Phase 4 deliverables.

## Architectural Baseline

These are recorded decisions, not completed product capabilities:

- ADR-001: Modular monolith with explicit bounded contexts and layered architecture.
- ADR-002: Strong consistency for internal changes and outbox-based integration events.
- ADR-003: Append-only financial ledger model.
- ADR-004: NATS JetStream for integration event delivery.
- ADR-005: Stateless horizontal scaling.
- ADR-006: Kysely and node-pg-migrate for persistence and migrations.

See [the ADR index](decisions/README.md) for rationale. No release is scheduled.
