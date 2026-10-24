# Changelog

Nothing has been released. This repository is in initial development; the entries below summarize the current baseline. Setup changes and internal tooling history live in git.

## [Unreleased]

### Changed

- Focused the marketplace on refurbished computers, with the first purchase use case and UX direction next (PD-0002).

### Added

- UC-001 backend slice: listings and orders modules with HTTP API (`/api/v1`) — seller publishes a refurbished-laptop listing with required disclosures, buyer browses and places an immediate single-unit order in SEK that lands in `Awaiting payment` with a timeline and 24h expiry, buyer can cancel; pooled stock cannot oversell under concurrent orders (optimistic locking). Includes Postgres schema/migration, shared Zod API contracts in `packages/api-contracts`, docker-compose Postgres, and unit + API integration tests. Auth is demo headers; payment, expiry enforcement, and the web UI follow in later slices.

- pnpm monorepo scaffold with a backend workspace, placeholder web app, and shared packages.
- Product direction and MVP scope for a trust-centered marketplace, with a roadmap toward the first visible workflow.
- Architecture decisions and engineering standards for module boundaries, financial invariants, transactional outbox events, and interface-first testing.
- Shared AI development instructions and optional role skills for Claude Code, Codex, and Gemini.

Future entries should describe notable product or architecture changes. Update `[Unreleased]` with the relevant implementation PR; use [the release checklist](docs/RELEASE_CHECKLIST.md) when preparing the first release.
