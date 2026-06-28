# Changelog

All notable changes to this project will be documented in this file.

This project follows:

- Semantic Versioning (MAJOR.MINOR.PATCH)
- Risk-based solo-founder AI workflow
- Financial correctness discipline
- Event-driven architectural integrity

---

## Versioning Strategy

### MAJOR

Breaking changes:

- API contract changes
- Event schema breaking changes
- Domain invariant changes
- Architectural boundary changes
- Database changes requiring migration strategy

### MINOR

Backward-compatible feature additions:

- New endpoints
- New domain behaviors (non-breaking)
- New events (non-breaking)
- Observability enhancements

### PATCH

Bug fixes:

- Correctness fixes
- Financial safety patches
- Performance fixes
- Internal refactors (no behavior change)

---

# [Unreleased]

## Added

- `AGENTS.md` as the single working guide and cross-tool bootstrap (default loop, when to slow down, agent roles, memory, where everything lives), with `CLAUDE.md` and `GEMINI.md` stubs.
- `docs/ENGINEERING_STANDARDS.md` as the authoritative merged engineering rules (invariants + architecture).
- `docs/design/` design-as-input intake (README + per-feature template) for consuming Figma/UI designs.
- `docs/working-with-ai-agents.md` — human-facing guide on using the AI agents, with worked flow examples for a simple change and a higher-risk feature.
- Lightweight slash commands wiring each role across tools: Claude Code (`.claude/commands/`), Gemini CLI (`.gemini/commands/`), and Codex (`.codex/prompts/`, activated with `make codex-commands`). Each command is a thin delegator to the canonical `agent/*.md` role file.
- `docs/product/discovery.md` for product brainstorming, open questions, and pre-use-case decisions.
- Expanded frontend architecture rules in `docs/architecture/web/REPO_MAP.md`, including feature structure, server/client boundaries, state management, UX states, accessibility, security, observability, and testing expectations.

## Changed

- Consolidated scattered governance docs into `AGENTS.md` (working guide) and `docs/ENGINEERING_STANDARDS.md` (rules), removing `ENGINEERING_HANDBOOK.md`, `docs/AGENT_GUIDELINES.md`, `docs/AI_OPERATING_MODEL.md`, and `docs/product/development-workflow.md`.
- Simplified the process to cut early cognitive load: collapsed the overlapping bootstrap docs (`AGENTS.md` + `docs/GUIDE.md` + `agent/README.md`) into a single `AGENTS.md`; removed the ops bureaucracy (`docs/ops/` — GitHub automation policy, audit log, worklog, summaries); consolidated to a single `docs/product/roadmap.md` and plain issues, with agents no longer integrated into the GitHub Project board (which remains for human/stakeholder tracking). Agent role files (`agent/*.md`) and risk tiers retained.
- Made the agent system tool-neutral: `agent/*.md` role files are the single source of truth; removed the duplicated `.agents/workflows/*` slash-command wrappers.
- Reframed docs to treat the repo as one product, with the backend/web split tucked into architecture detail rather than leading the narrative.
- Reframed agent workflows from mandatory stage gates to optional role lenses, with strict gates reserved for high-risk domain work.
- Updated product roadmap and vision to prioritize product discovery, frontend UX, and a thin visible marketplace slice before deeper backend complexity.
- Clarified that `apps/web` is currently a placeholder package and Next.js is the intended frontend direction.
- Updated handbook, testing strategy, agent workflows, and PR template so frontend quality is reviewed alongside backend architecture.

## Fixed

-

## Financial Impact

-

## Event Impact

-

## Architecture Notes

- Documentation governance changed only; no runtime architecture changed.

# [X.Y.Z] - YYYY-MM-DD

## Summary

Short description of this release and its scope.

---

## Added

- ***

## Changed

- ***

## Fixed

- ***

## Financial Impact

Indicate if release affects:

- Escrow
- Ledger
- Settlement
- Refunds
- Payments

Example:

- Improved escrow release idempotency
- Added invariant enforcement for partial refunds

If no impact:

- No financial behavior changed

---

## Event Impact

Document event-level changes:

- New events introduced
- Event schema changes
- Versioned events
- Consumer behavior changes

Example:

- Added `EscrowPartiallyRefunded` event (v1)
- Versioned `OrderStatusChanged` to v2 (non-breaking)

If none:

- No event model changes

---

## Architecture Notes

- New aggregate introduced?
- Cross-context change?
- New bounded context?
- Significant refactor?
- ADR reference (if applicable)

Example:

- Introduced EscrowRefundPolicy domain service
- ADR-004: Adopt optimistic locking for financial aggregates

---

## Migration Notes (If Applicable)

- Database migrations
- Backfill scripts
- Manual steps required
- Feature flags enabled/disabled

If none:

- No migration required

---

## Observability

- Logs added/updated
- Metrics added
- Tracing improvements

If none:

- No observability changes

---

## Known Limitations

- ***

# Template for New Release Entry

Copy this when creating a new release:

```
# [X.Y.Z] - YYYY-MM-DD

## Summary

-

## Added
-

## Changed
-

## Fixed
-

## Financial Impact
-

## Event Impact
-

## Architecture Notes
-

## Migration Notes
-

## Observability
-

## Known Limitations
-
```

---

# Release Discipline

## Ownership & Cadence

- Primary owner: Technical Writer (`/tech-writer`)
- Release owner: Release Manager (`/release-manager`)
- Update cadence:
  - after each merged PR → update `[Unreleased]`
  - at release → verify completeness against git history

### Post-Merge Rule

- Do not wait for release day to document changes.
- Every merged PR should be reflected in `[Unreleased]` before issue closeout.

Before updating this file:

- Complete docs/RELEASE_CHECKLIST.md
- Ensure milestone issues are closed
- Verify Financial Impact section is accurate
- Verify Event Impact section is accurate
- Confirm no undocumented breaking changes

---

# Principle

The changelog is not marketing.

It is an engineering artifact that documents:

- Domain evolution
- Financial safety improvements
- Event model changes
- Architectural maturity

If a future reader cannot understand what changed and why, the entry is incomplete.
