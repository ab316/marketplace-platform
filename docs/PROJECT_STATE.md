# Project State

Current status, recent milestones, and active risks. Keep the latest 5–10 meaningful completed items, newest first, and prune older entries. Detailed implementation and tooling history belong in git; routine housekeeping needs no entry.

## Status

- Solo-founder repository in initial development, with no releases or other users' clones to support.
- Monorepo scaffold only; no implemented marketplace workflow yet.
- Shared AI instructions and optional role skills are available through [AGENTS.md](../AGENTS.md).

## Current Focus

Phase 0 — define the first refurbished-computer purchase use case. The niche is chosen in [PD-0002](product/decisions/0002-refurbished-computers.md); the trust-centered product model and MVP scope are defined in [PD-0001](product/decisions/0001-product-direction.md) and [the MVP scope](product/mvp-scope.md).

Next: settle the first demo's behavior and UX direction, then build a thin visible workflow across web and backend. See [the roadmap](product/roadmap.md).

## Recent Completed

- Chose refurbished computers as the marketplace niche, with shipment, delivery, and device lifecycle workflows as expansion opportunities (PD-0002).
- Updated the shared AI workflow to repository skills for Claude Code, Codex, and Gemini.
- Defined the interface-first testing strategy, with API/workflow integration and direct checks for critical invariants.
- Established the trust-centered product direction, MVP scope, and roadmap in `docs/product/`.
- Consolidated the working guide and engineering standards, with optional roles and stronger checks for money/concurrency/event work.
- Defined frontend architecture principles and design intake for the first visible product slice.

## Active Risks and Gaps

- The first stable use case is still undefined: settle the initial assortment, listing disclosures, inventory/reservation behavior, and purchase flow.
- `apps/web` is a placeholder TypeScript package; Next.js is the intended direction.
- Backend modules are scaffold only, with no implemented domain/application logic or registered integration events.
- The test runner currently reports no tests; passing repository checks does not establish product behavior coverage.
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
