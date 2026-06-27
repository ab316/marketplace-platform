# Project State

This is the bounded executive summary of the project for AI and human operators.

Maintenance rules:

- Keep concise (target <= 200 lines)
- Keep most-recent items first
- Link to detailed history (`docs/ops/worklog/*`, `docs/ops/summaries/*`)
- Prune stale summary lines instead of growing indefinitely

## Current Focus

- Re-centering the repository around solo-founder AI-assisted product development.
- Treating the current codebase as an early monorepo skeleton, not an implemented marketplace.
- Defining the first product slice and frontend experience before expanding backend-heavy scaffolding.
- Preserving high-rigor architecture rules for financial/event/concurrency work without forcing that process onto every change.

## Recent Completed (Last 5-10)

- Added `docs/AI_OPERATING_MODEL.md` as the default workflow for AI-assisted solo development.
- Added `docs/product/discovery.md` for brainstorming, open questions, and pre-use-case product decisions.
- Aligned agent governance docs on precedence, role coverage, risk-based workflow, and handoffs.
- Normalized integration event policy wording (`MUST` versioned + required catalog/module README updates).
- Normalized backend test path conventions in architecture docs (`test/integration/api`, `test/e2e`).
- Updated ADR index to include ADR-006 and corrected ADR-001 date in ADR table.
- Replaced backend module/event catalog placeholders with current scaffold status entries.
- Clarified release checklist with explicit human approval gate for publish/tag actions.
- Reconciled NFR testability wording with `TESTING_STRATEGY.md` taxonomy.

## Active Risks and Tech Debt

- Product niche and first end-to-end workflow are still undecided.
- Frontend is documented as Next.js direction but `apps/web` is currently only a placeholder TypeScript package.
- Existing docs still contain some backend-first assumptions and should be simplified opportunistically.
- Backend modules are scaffold directories only (`identity`, `shared`) with no implemented domain/application logic yet.
- No integration events are registered yet; event catalog is currently "none registered."
- `CHANGELOG.md` `[Unreleased]` sections are still empty; ongoing work needs backfill entries for traceability.
- Ops memory should stay lightweight; no worklog is required for trivial edits.

## Key Constraints and ADR Highlights

- ADR-001: Modular monolith with explicit bounded contexts and layered architecture.
- ADR-002: Strong consistency for internal changes + outbox-based integration events.
- ADR-003: Append-only financial ledger model for money-domain correctness.
- ADR-004: NATS JetStream selected for reliable integration event delivery.
- ADR-005: Stateless horizontal scaling constraints for app/runtime behavior.
- ADR-006: Kysely + node-pg-migrate chosen for typed SQL + explicit, reviewable migrations.

## Milestone and Release Snapshot

- Current milestone: Phase 1A - Foundation (roadmap target).
- Release target: Not scheduled yet (no version cut in changelog).

## Deep History Pointers

- Latest worklogs: `docs/ops/worklog/`
- Latest summaries: `docs/ops/summaries/`
