# Changelog

Nothing has been released. This repository is in initial development; the entries below summarize the current baseline. Setup changes and internal tooling history live in git.

## [Unreleased]

### Changed

- Focused the marketplace on refurbished computers, with the first purchase use case and UX direction next (PD-0002).
- The backend now serves a real HTTP API; `src/index.ts` boots Fastify through the composition root instead of logging and exiting.

### Added

- UC-001, the first stable use case: a seller organization publishes a refurbished-laptop listing, a buyer discovers it and places a single-unit SEK order, and the order timeline shows `Awaiting payment` and the next step.
- `listings` and `orders` backend modules implementing UC-001, with pooled stock, 24-hour reservation expiry, an immutable listing snapshot per order, and an append-only order timeline.
- Backend HTTP API over Fastify with shared Zod contracts in `packages/api-contracts`, a stable error envelope, and a stubbed `x-actor-id` identity for seller and buyer actors.
- Hand-written Postgres schema and migration for `listings`, `orders`, and `order_timeline_entries`, including a database-level no-oversell constraint.
- An in-memory persistence mode (`PERSISTENCE=memory`) so the API runs with no external dependencies, plus `docker-compose.yml` for local Postgres.

- pnpm monorepo scaffold with a backend workspace, placeholder web app, and shared packages.
- Product direction and MVP scope for a trust-centered marketplace, with a roadmap toward the first visible workflow.
- Architecture decisions and engineering standards for module boundaries, financial invariants, transactional outbox events, and interface-first testing.
- Shared AI development instructions and optional role skills for Claude Code, Codex, and Gemini.

Future entries should describe notable product or architecture changes. Update `[Unreleased]` with the relevant implementation PR; use [the release checklist](docs/RELEASE_CHECKLIST.md) when preparing the first release.
