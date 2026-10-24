# Project State

Current status, recent milestones, and active risks. Keep the latest 5–10 meaningful completed items, newest first, and prune older entries. Detailed implementation and tooling history belong in git; routine housekeeping needs no entry.

## Status

- Solo-founder repository in initial development, with no releases or other users' clones to support.
- First backend workflow implemented (UC-001 listings → order via API); web app still a placeholder.
- Shared AI instructions and optional role skills are available through [AGENTS.md](../AGENTS.md).

## Current Focus

Phase 0 → 1 transition. The first stable use case is approved: [UC-001 — buyer orders a refurbished laptop](product/use-cases/UC-001-buyer-orders-refurbished-laptop.md) (laptops only, pooled-stock listings with condition guarantees, immediate single-unit order in SEK, 24h unpaid expiry). The niche is chosen in [PD-0002](product/decisions/0002-refurbished-computers.md); the product model and MVP scope are defined in [PD-0001](product/decisions/0001-product-direction.md) and [the MVP scope](product/mvp-scope.md).

The UC-001 backend slice is implemented: listings and orders modules, `/api/v1` HTTP API, Postgres schema/migration, shared Zod contracts, and unit + API integration tests. Next: the web UI and UX direction, then payment/expiry enforcement. See [the roadmap](product/roadmap.md).

## Recent Completed

- Implemented the UC-001 backend slice: listings/orders modules, `/api/v1` API, Postgres migration, API contracts package, unit + API integration tests (2026-10-24).
- Approved UC-001 — buyer orders a refurbished laptop (laptops only, pooled stock, immediate single-unit order in SEK, 24h expiry) (2026-10-24).
- Chose refurbished computers as the marketplace niche, with shipment, delivery, and device lifecycle workflows as expansion opportunities (PD-0002).
- Updated the shared AI workflow to repository skills for Claude Code, Codex, and Gemini.
- Defined the interface-first testing strategy, with API/workflow integration and direct checks for critical invariants.
- Established the trust-centered product direction, MVP scope, and roadmap in `docs/product/`.
- Consolidated the working guide and engineering standards, with optional roles and stronger checks for money/concurrency/event work.
- Defined frontend architecture principles and design intake for the first visible product slice.

## Active Risks and Gaps

- UC-001 defers automated unpaid-order expiry enforcement to the payment slice; until then expiry is a displayed rule only.
- `apps/web` is a placeholder TypeScript package; Next.js is the intended direction.
- UC-001 runs with demo-header identity (`x-user-id`, `x-organization-id`); real authentication/authorization, DB transactions, and structured logging are deliberately deferred.
- API integration tests require a local Postgres (`docker compose up -d postgres`); without it they skip and only unit tests run.
- Avoid expanding backend scaffolding or process documentation before a visible product slice exists.

## Architectural Baseline

These are recorded decisions, not completed product capabilities:

- ADR-001: Modular monolith with explicit bounded contexts and layered architecture.
- ADR-002: Strong consistency for internal changes and outbox-based integration events.
- ADR-003: Append-only financial ledger model.
- ADR-004: NATS JetStream for integration event delivery.
- ADR-005: Stateless horizontal scaling.
- ADR-006: Kysely and node-pg-migrate for persistence and migrations.

See [the ADR index](decisions/README.md) for rationale. No release is scheduled.
