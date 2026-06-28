# Project State

This is the bounded executive summary of the project for AI and human operators.

Maintenance rules:

- Keep concise (target <= 100 lines)
- Keep most-recent items first
- Prune stale summary lines instead of growing indefinitely; deeper detail lives in git history and `CHANGELOG.md`

## Current Focus

- Re-centering the repository around solo-founder AI-assisted product development.
- Treating the current codebase as an early monorepo skeleton, not an implemented marketplace.
- Defining the first product slice and frontend experience before expanding backend-heavy scaffolding.
- Establishing frontend architecture principles so web quality matches backend rigor.
- Preserving high-rigor architecture rules for financial/event/concurrency work without forcing that process onto every change.

## Recent Completed (Last 5-10)

- Simplified process to reduce cognitive load: collapsed the three overlapping bootstrap docs into a single `AGENTS.md` (working guide + read order); removed `docs/GUIDE.md` and `agent/README.md`. Deleted the ops bureaucracy (`docs/ops/` — automation policy, audit log, worklog, summaries). Consolidated to a single `docs/product/roadmap.md` and plain issues; agents are no longer integrated with the GitHub Project board (which remains for human/stakeholder tracking). Agent roles (`agent/*.md`) and risk tiers retained.
- Added lightweight slash commands wiring each role for Claude Code (`.claude/commands/`), Gemini CLI (`.gemini/commands/`), and Codex (`.codex/prompts/` + `make codex-commands`), and a human-facing guide `docs/working-with-ai-agents.md` with worked flow examples.
- Consolidated documentation: added `docs/ENGINEERING_STANDARDS.md` (merged rules); removed `ENGINEERING_HANDBOOK.md`, `docs/AGENT_GUIDELINES.md`, `docs/AI_OPERATING_MODEL.md`, `docs/product/development-workflow.md`.
- Made the agent system tool-neutral: `agent/*.md` is the single source of truth; removed duplicated `.agents/workflows/*`; added `AGENTS.md` hub with `CLAUDE.md`/`GEMINI.md` stubs.
- Added `docs/design/` design-as-input intake (Figma references consumed by implement/review).
- Added `docs/product/discovery.md` for brainstorming, open questions, and pre-use-case product decisions.
- Expanded `docs/architecture/web/REPO_MAP.md` into the canonical frontend architecture standard.
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
- Some deeper docs may still contain backend-first assumptions and should be simplified opportunistically.
- Backend modules are scaffold directories only (`identity`, `shared`) with no implemented domain/application logic yet.
- No integration events are registered yet; event catalog is currently "none registered."
- `CHANGELOG.md` `[Unreleased]` sections are still empty; ongoing work needs backfill entries for traceability.
- Project memory should stay lightweight; trivial edits get no record beyond git history.

## Key Constraints and ADR Highlights

- ADR-001: Modular monolith with explicit bounded contexts and layered architecture.
- ADR-002: Strong consistency for internal changes + outbox-based integration events.
- ADR-003: Append-only financial ledger model for money-domain correctness.
- ADR-004: NATS JetStream selected for reliable integration event delivery.
- ADR-005: Stateless horizontal scaling constraints for app/runtime behavior.
- ADR-006: Kysely + node-pg-migrate chosen for typed SQL + explicit, reviewable migrations.

## Milestone and Release Snapshot

- Current milestone: Phase 0 - Product Direction (see `docs/product/roadmap.md`).
- Release target: Not scheduled yet (no version cut in changelog).
