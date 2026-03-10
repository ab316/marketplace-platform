# Project State

This is the bounded executive summary of the project for AI and human operators.

Maintenance rules:

- Keep concise (target <= 200 lines)
- Keep most-recent items first
- Link to detailed history (`docs/ops/worklog/*`, `docs/ops/summaries/*`)
- Prune stale summary lines instead of growing indefinitely

## Current Focus

- Documentation governance alignment for multi-tool AI usage (`AGENTS.md` bootstrap + canonical `docs/AGENT_GUIDELINES.md`).
- Foundation-phase architecture scaffolding for backend bounded contexts.
- Keeping architecture/ADR/catalog docs synchronized with actual repository state.

## Recent Completed (Last 5-10)

- Aligned agent governance docs on precedence, role coverage, strict stage gates, and workflow handoffs.
- Normalized integration event policy wording (`MUST` versioned + required catalog/module README updates).
- Normalized backend test path conventions in architecture docs (`test/integration/api`, `test/e2e`).
- Updated ADR index to include ADR-006 and corrected ADR-001 date in ADR table.
- Replaced backend module/event catalog placeholders with current scaffold status entries.
- Clarified release checklist with explicit human approval gate for publish/tag actions.
- Reconciled NFR testability wording with `TESTING_STRATEGY.md` taxonomy.

## Active Risks and Tech Debt

- Backend modules are scaffold directories only (`identity`, `shared`) with no implemented domain/application logic yet.
- No integration events are registered yet; event catalog is currently "none registered."
- `CHANGELOG.md` `[Unreleased]` sections are still empty; ongoing work needs backfill entries for traceability.
- Ops memory is still sparse (no atomic per-PR worklog entries yet).

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
