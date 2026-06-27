# AI Operating Model

This repository is a solo-founder, AI-assisted product workspace. AI should increase leverage without taking control of product direction, architecture, or release decisions away from the human owner.

Use this file as the default operating model. `docs/AGENT_GUIDELINES.md` remains authoritative for architectural safety rules.

## Current Reality

- The codebase is an early monorepo skeleton, not a working marketplace yet.
- `apps/backend` contains the intended backend foundation.
- `apps/web` is currently a placeholder package; Next.js is the intended frontend direction, not implemented state.
- Most existing documentation describes the desired engineering system rather than shipped product behavior.

## Principles

- Human owns product direction, tradeoffs, and release decisions.
- AI can draft, critique, implement, test, and summarize, but must keep assumptions visible.
- Documentation should preserve decisions and usable context, not every conversation.
- Heavy process is reserved for high-risk work; ordinary changes should stay lightweight.
- Product discovery and architecture should evolve together, but product usefulness comes first.

## Default Loop

Use this loop for normal solo development:

1. **Discover** - clarify the user/customer problem, target workflow, and smallest useful slice.
2. **Decide** - record durable decisions in product docs or ADRs when they affect future work.
3. **Design** - outline boundaries, data, UI flow, and test strategy only as deeply as the change needs.
4. **Build** - implement one vertical slice with tests.
5. **Review** - check correctness, scope, UX, architecture boundaries, and docs impact.
6. **Record** - update `CHANGELOG.md`, `docs/PROJECT_STATE.md`, or a concise worklog only when useful.

The old multi-role pipeline is optional. Use it as a set of lenses, not as mandatory ceremony.

## Risk Tiers

### Tier 0 - Discovery and Docs

Examples: product brainstorming, roadmap edits, README cleanup, decision notes.

Expected process:

- Update the relevant doc directly.
- Keep open questions explicit.
- No GitHub Projects ceremony required.

### Tier 1 - Low-Risk Code

Examples: UI prototype, local developer tooling, non-financial CRUD, validation-only change.

Expected process:

- Brief plan.
- Implement with focused tests.
- Update docs only where they help future work.

### Tier 2 - Product Feature

Examples: user-facing workflow, persistence, authz, cross-package API contract.

Expected process:

- Write or update a use case in `docs/product/use-cases/` if behavior is stable enough.
- Define acceptance criteria and test coverage.
- Review frontend/backend contract impact.

### Tier 3 - High-Risk Domain Work

Examples: payments, ledger, settlement, refunds, outbox/messaging, idempotency, concurrency-sensitive state transitions.

Expected process:

- Use the stricter role sequence from `docs/product/development-workflow.md`.
- Add or update ADRs, event catalog entries, and module READMEs as needed.
- Require destructive tests for retries, duplicate delivery, and concurrent requests.

## Agent Roles

The files in `agent/` are reusable prompts, not a required team simulation.

- Use `/product-owner` when an idea needs shaping.
- Use `/risk-review` for financial, event, concurrency, or auth risk.
- Use `/architect` when boundaries or architecture are unclear.
- Use `/implement` when ready to code.
- Use `/qa` for destructive test design.
- Use `/review` before merging meaningful code.
- Use `/tech-writer` and `/chronicler` when docs or project state need synchronization.

For small changes, one capable agent may do several of these checks in a single pass.

## Product Discovery Docs

Use `docs/product/discovery.md` for living product thinking:

- target users
- problem hypotheses
- feature ideas
- open questions
- decisions that are not yet ADR-level

Promote stable behavior into `docs/product/use-cases/`. Promote architectural decisions into `docs/decisions/`.

## Memory Policy

Keep memory useful and small:

- `docs/PROJECT_STATE.md` is the only file agents should read by default for current project context.
- `docs/ops/worklog/` is for significant merged changes, important decisions, or complex debugging history.
- `docs/ops/summaries/` is optional; use it only if worklog volume becomes too large.
- Do not create worklogs for trivial edits.
- Do not preserve transcript-level detail unless it explains a decision that would otherwise be lost.

## GitHub Automation

GitHub Issues and Projects can help when work has clear scope, but they should not become mandatory overhead during discovery.

Use GitHub automation for:

- implementation-ready work
- bug tracking
- PR/issue traceability
- release coordination

Do not use automation to bury product decisions in issue comments. Durable decisions belong in repo docs.
