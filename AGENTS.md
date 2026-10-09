# AGENTS.md

Single entrypoint for working in this repo — as a human or with any AI agent (Claude Code, Codex, Gemini, …). `CLAUDE.md` and `GEMINI.md` explicitly import this file.

This is the one file you need to start. Everything else is reference you open only when a task needs it.

## What this is

A multi-tenant marketplace platform (buyers, sellers, operators) with strong money guarantees: never double-charge, never double-settle, always auditable. It is set up for **solo-founder, AI-assisted development** — AI helps with discovery, design, implementation, tests, and review; you keep product direction, architecture tradeoffs, and releases.

Under the hood it is a pnpm monorepo: `apps/backend` (modular monolith, DDD), `apps/web` (Next.js, currently a placeholder), and shared `packages/*`. Think in product capabilities, not "backend vs frontend."

> **Reality check:** there is no product code yet — only scaffold. The near-term goal is to pick the first slice and ship a thin visible workflow, not to expand backend scaffolding. See `docs/product/roadmap.md`.

## Commands

```bash
pnpm install                  # install deps (Node from .nvmrc, pnpm via corepack)
pnpm run check                 # format:check + lint + typecheck + test — run before opening a PR
pnpm run lint                  # oxlint + module-boundary check (docs/architecture/manifest.json)
pnpm run typecheck             # recursive workspace typecheck
pnpm run test                  # backend tests (apps/backend)
pnpm run test:coverage         # backend tests with coverage
pnpm run format                # oxfmt write
pnpm run migrate:create -- <name>   # new backend migration
pnpm run migrate:up / migrate:down  # apply/rollback backend migrations
```

Equivalent `make` targets exist for the backend workspace (`make dev/backend`, `make test/backend`, …) — see `Makefile`. Frontend scripts land once `apps/web` is initialized as a real Next.js app. Test locations by kind are listed under "Critical conventions" below.

## Read order (keep context bounded — don't dump the whole repo)

1. `docs/product/roadmap.md` — what we're building and what's next (read by default).
2. This file — how to work here.
3. `docs/ENGINEERING_STANDARDS.md` — invariants and architectural rules, when touching code.
4. Task-relevant reference only — `docs/architecture/*`, the relevant use case, ADRs in `docs/decisions/`, `docs/TESTING_STRATEGY.md`.

## The loop

Default to one lightweight pass: **discover → decide → build → review → record.** Most changes are exactly this. Escalate only when risk justifies it (below).

- **Money/concurrency/event code** — payments, ledger, settlement, refunds, outbox/messaging, idempotency, concurrency-sensitive state transitions: go slower. Write the invariant into the domain, add destructive tests (retries, duplicates, concurrency), and update `docs/architecture/backend/EVENT_CATALOG.md` for any integration event. When unsure whether something is in this bucket, assume it is and choose the conservative option.
- **Everything else:** just build it with focused tests.

The non-negotiable invariants live in `docs/ENGINEERING_STANDARDS.md`.

## Roles (optional lenses)

Role definitions live in `agent/*.md` (base rules in `agent/shared.md`). They are reusable lenses, **not** a mandatory team. For most work, one session runs the whole loop. Reach for a role only when you want a focused pass.

**Invoke a role** through a repository skill, such as `marketplace-review`. Codex and Gemini discover `.agents/skills/`; Claude uses `.claude/skills/` adapters. Both sets point to the same `agent/*.md` files. No global installation is needed. Tool-specific invocation and all skill names are in `docs/working-with-ai-agents.md`.

The portable fallback: _"Act as the role in `agent/<role>.md` (and `agent/shared.md`). Task: …"_ A role is a lens for the current session, not a request to launch a team.

New to the agents, or want worked flow examples? See `docs/working-with-ai-agents.md`.

| Role                | File                       | Use it for                                                             |
| ------------------- | -------------------------- | ---------------------------------------------------------------------- |
| Product Owner       | `agent/po.md`              | Turn a rough idea into a scoped story with acceptance criteria.        |
| CTO / Risk Reviewer | `agent/cto.md`             | Surface financial, concurrency, event, auth risks; produce guardrails. |
| Architect           | `agent/architect.md`       | Module boundaries and a minimal correct design.                        |
| Implementer         | `agent/implementer.md`     | Build one vertical slice with tests.                                   |
| QA                  | `agent/qa.md`              | Destructive test matrix and exit criteria.                             |
| Reviewer            | `agent/reviewer.md`        | PR preflight: correctness, safety, completeness.                       |
| Release Manager     | `agent/release-manager.md` | Release checklist, semver rationale.                                   |

For high-risk money work you can chain them: `po → cto → architect → implementer → qa → reviewer`.

## Design

UI design happens **outside this repo** (Figma, design tools). The repo consumes finished design as an input; agents implement and review _against_ it rather than inventing UI. Capture a lightweight per-feature spec under `docs/design/` that links to the Figma source when one exists.

## Memory — keep it small

| What                                          | Where                                              |
| --------------------------------------------- | -------------------------------------------------- |
| What we're building / next / current focus    | `docs/product/roadmap.md`                          |
| Current state, active risks                   | `docs/PROJECT_STATE.md`                            |
| User-visible or architecture-relevant changes | `CHANGELOG.md`                                     |
| Product thinking before it's a use case       | `docs/product/discovery.md`, `docs/product/ideas/` |
| Settled behavior                              | `docs/product/use-cases/`                          |
| Durable product decisions                     | `docs/product/decisions/` (PDs)                    |
| Durable architectural decisions               | `docs/decisions/` (ADRs)                           |

Don't preserve transcript-level detail. Trivial edits get no record beyond git. Durable decisions go in repo docs, not buried in issue comments or personal tool memory. Update affected behavior docs and changelog entries in the same PR as the change; use post-merge work only to reconcile status.

## GitHub

A GitHub Project board exists for human and stakeholder tracking. **Agents are not integrated with it** — they don't manage board columns, fields, or automation. Agents work with **plain issues** (`.github/ISSUE_TEMPLATE/`) when an issue is genuinely useful. Issue/PR mutations must be part of the user's requested task; invoking a role alone does not authorize unrelated posting or cleanup. Agents may prepare release notes and draft actions, but humans merge PRs, delete branches, create/push release tags, and publish releases. Agents do not change repo settings. The roadmap is `docs/product/roadmap.md`.

## Critical conventions

- **Integration events** must be persisted through the transactional outbox and use versioned names/schemas (e.g. `OrderPlaced.v1`). When adding/changing them, update `docs/architecture/backend/EVENT_CATALOG.md` and the producer/consumer module README `Publishes`/`Consumes` sections.
- **Test locations:** backend unit → `apps/backend/test/unit`; API integration → `apps/backend/test/integration/api`; backend workflows → `apps/backend/test/integration/workflows`; selective application-layer integration → `apps/backend/test/integration/application`; messaging → `apps/backend/test/integration/messaging`; contract → `apps/backend/test/contract`; system E2E → `test/e2e`.
- Full rules: `docs/ENGINEERING_STANDARDS.md`.

## Where things live

| You want…                                | Go to                                            |
| ---------------------------------------- | ------------------------------------------------ |
| What we're building & next               | `docs/product/roadmap.md`                        |
| Current state & risks                    | `docs/PROJECT_STATE.md`                          |
| Engineering rules & invariants           | `docs/ENGINEERING_STANDARDS.md`                  |
| How to use the AI agents (with examples) | `docs/working-with-ai-agents.md`                 |
| Agent role definitions                   | `agent/*.md`                                     |
| Product brain (brief, strategy, backlog) | `docs/product/` (hub: its `README.md`)           |
| Architecture maps                        | `docs/architecture/`                             |
| Product decisions (PDs)                  | `docs/product/decisions/`                        |
| Architecture decisions (ADRs)            | `docs/decisions/`                                |
| Tech stack / testing                     | `docs/TECH_STACK.md`, `docs/TESTING_STRATEGY.md` |
| Setup & scripts                          | `README.md`                                      |
