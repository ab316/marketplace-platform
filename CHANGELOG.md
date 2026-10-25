# Changelog

Nothing has been released. This repository is in initial development; the entries below summarize the current baseline. Setup changes and internal tooling history live in git.

## [Unreleased]

### Changed

- Every listing and order endpoint now requires a real session instead of the `x-actor-id` header, and enforces organization membership and role. Anonymous catalogue browsing is unchanged.
- Deactivating a seller organization hides its listings from buyers and stops new orders, without deleting any listing, order, or history.
- Reorganized the roadmap around the new Identity and Access Control phase (now Phase 2; later phases renumbered), with scope set by PD-0003 and the session strategy by ADR-008. Email verification and password reset are deferred to backlog P1-008/P1-009.
- Focused the marketplace on refurbished computers, with UC-001 defining the first purchase use case (PD-0002).
- The backend now serves a real HTTP API; `src/index.ts` boots Fastify through the composition root instead of logging and exiting.

### Added

- Identity and access control (UC-002, UC-003): email/password sign-up and sign-in, opaque server-side sessions with immediate revocation (ADR-008), self-serve seller organizations, fixed `owner`/`manager`/`viewer` roles, a `platform_admin` role with cross-organization inspection and organization deactivate/reactivate, and an append-only organization audit trail.
- An authorized operator order-inspection path: marketplace staff can open any order with its timeline, regardless of organization.
- Postgres schema and migration for `users`, `user_credentials`, `sessions`, `organizations`, `organization_memberships`, and `organization_audit_entries`, plus the foreign keys from `listings` and `orders` that the initial schema could not yet declare.
- UC-001, the first stable use case: a seller organization publishes a refurbished-laptop listing, a buyer discovers it and places a single-unit SEK order, and the order timeline shows `Awaiting payment` and the next step.
- `listings` and `orders` backend modules implementing UC-001, with pooled stock, 24-hour reservation expiry, an immutable listing snapshot per order, and an append-only order timeline.
- Backend HTTP API over Fastify with shared Zod contracts in `packages/api-contracts` and a stable error envelope. (The original `x-actor-id` identity stub it shipped with has since been replaced by real authentication.)
- Hand-written Postgres schema and migration for `listings`, `orders`, and `order_timeline_entries`, including a database-level no-oversell constraint.
- An in-memory persistence mode (`PERSISTENCE=memory`) so the API runs with no external dependencies, plus `docker-compose.yml` for local Postgres.

- pnpm monorepo scaffold with a backend workspace, placeholder web app, and shared packages.
- Product direction and MVP scope for a trust-centered marketplace, with a roadmap toward the first visible workflow.
- Architecture decisions and engineering standards for module boundaries, financial invariants, transactional outbox events, and interface-first testing.
- Shared AI development instructions and optional role skills for Claude Code, Codex, and Gemini.

Future entries should describe notable product or architecture changes. Update `[Unreleased]` with the relevant implementation PR; use [the release checklist](docs/RELEASE_CHECKLIST.md) when preparing the first release.
