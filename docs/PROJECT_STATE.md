# Project State

Current status, recent milestones, and active risks. Keep the latest 5–10 meaningful completed items, newest first, and prune older entries. Detailed implementation and tooling history belong in git; routine housekeeping needs no entry.

## Status

- Solo-founder repository in initial development, with no releases or other users' clones to support.
- The UC-001 backend slice is implemented: a seller organization can publish a refurbished-laptop listing, a buyer can discover it and place a single-unit SEK order, and the order page shows `Awaiting payment` with a timeline. Exercisable over HTTP; see [the API guide](../apps/backend/src/api/README.md).
- No frontend yet: `apps/web` is still a placeholder.
- Shared AI instructions and optional role skills are available through [AGENTS.md](../AGENTS.md).

## Current Focus

Phase 1 — the thin marketplace slice specified by [UC-001](product/use-cases/UC-001-buyer-orders-refurbished-laptop.md). The backend is done; the remaining Phase 1 deliverables are the Next.js frontend, the generated OpenAPI specification and typed client, and the UX direction left over from Phase 0.

Next: decide whether to build the web surface for UC-001 or move to payment/escrow (Phase 3 groundwork). See [the roadmap](product/roadmap.md).

## Recent Completed

- Implemented the UC-001 backend: `listings` and `orders` modules, Fastify API, hand-written Postgres schema and migration, and 71 domain/API/application tests.
- Approved UC-001 as the first stable use case: laptops only, pooled-stock listings, immediate single-unit orders in SEK, 24-hour unpaid reservation expiry.
- Chose refurbished computers as the marketplace niche, with shipment, delivery, and device lifecycle workflows as expansion opportunities (PD-0002).
- Updated the shared AI workflow to repository skills for Claude Code, Codex, and Gemini.
- Defined the interface-first testing strategy, with API/workflow integration and direct checks for critical invariants.
- Established the trust-centered product direction, MVP scope, and roadmap in `docs/product/`.
- Consolidated the working guide and engineering standards, with optional roles and stronger checks for money/concurrency/event work.
- Defined frontend architecture principles and design intake for the first visible product slice.

## Active Risks and Gaps

- **The Postgres adapter has never been executed.** Migrations, `PgListingRepository`, and `PgOrderRepository` are written but unrun: no Postgres or Docker was available in the implementation environment. Verify `pnpm migrate:up` and a `PERSISTENCE=postgres` run before trusting them.
- Tests run against in-memory repositories, not Postgres, so they prove domain and HTTP behavior but **not** SQL, constraints, or real concurrency. This deviates from `TESTING_STRATEGY.md`, which requires real Postgres for API tests; it was a deliberate scope choice. Testcontainers-backed persistence tests are the fix.
- No authentication: the caller is identified by an `x-actor-id` header matching fixed seed actors. Authorization checks exist but rest on that stub.
- Reserving a unit and writing the order are separate writes with no shared transaction; `CreateOrder` compensates on failure. A cross-module transaction boundary still needs the unit-of-work decision ADR-007 left open.
- `apps/web` is a placeholder TypeScript package; Next.js is the intended direction.
- No integration events, outbox, or messaging yet; the first will be `OrderPlaced.v1` in Phase 3.
- The generated OpenAPI specification and typed frontend client remain unimplemented Phase 1 deliverables.

## Architectural Baseline

These are recorded decisions, not completed product capabilities:

- ADR-001: Modular monolith with explicit bounded contexts and layered architecture.
- ADR-002: Strong consistency for internal changes and outbox-based integration events.
- ADR-003: Append-only financial ledger model.
- ADR-004: NATS JetStream for integration event delivery.
- ADR-005: Stateless horizontal scaling.
- ADR-006: Kysely and node-pg-migrate for persistence and migrations.

See [the ADR index](decisions/README.md) for rationale. No release is scheduled.
