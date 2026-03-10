# marketplace-platform

A multi-tenant marketplace where organizations can list assets/services, buyers can make offers, and the platform handles payments, order fulfillment, disputes, refunds, and settlement—with strong guarantees that you never double-charge, never double-settle, and can always audit what happened.
The key challenge: the system spans multiple concerns that are hard in real life:

- money movement (Stripe or simulated PSP)
- asynchronous workflows (payment → escrow → fulfillment → settlement)
- partial failures (network errors, retries, duplicate events)
- cross-service consistency (eventual consistency + correctness)
- auditability (who did what, when, and why)

It is solved with DDD + Clean Architecture + event-driven microservices, starting as a modular monolith and evolving into microservices without rewriting the core domain.

## What This Project Optimizes For

- financial correctness and auditability
- safe asynchronous workflows (outbox, idempotency, replay tolerance)
- solo-founder leverage through specialized AI agents
- bounded, durable project memory for long-running execution

**Architecture Principles**

Domain & Design

- Domain-Driven Design
- Clean Architecture
- Bounded contexts
- Aggregates & invariants

Architecture Patterns

- Event-driven architecture
- Saga orchestration
- CQRS projections
- Transactional outbox
- Idempotent processing

Platform Engineering

- Observability & tracing
- Reliability & replayability
- GitOps & cloud-native deployment

Product Engineering

- Trust & transparency flows
- Analytics & experimentation
- AI-powered features

## AI Capabilities

This repository includes an operational AI system that can run most of the software lifecycle with you as reviewer/orchestrator.

### Role-Based Agent System

Roles are defined in `agent/*.md` and invoked via `.agents/workflows/*.md` slash commands:

- `/scrum-master` — intake, triage, dedup, issue/project operations
- `/product-owner` — story definition and acceptance criteria
- `/risk-review` — financial/concurrency/event risk guardrails
- `/architect` — architecture and bounded-context design
- `/implement` — implementation plan + code/test execution support
- `/qa` — destructive test matrix and exit criteria
- `/review` — PR preflight with optional GitHub PR posting
- `/tech-writer` — post-merge changelog/catalog synchronization
- `/chronicler` — project memory maintenance
- `/release-manager` — release checklist, semver rationale, draft release prep

See `agent/README.md` for full role behavior and handoffs.

### End-to-End Agent Pipeline

Delivery path:

`/scrum-master (intake) -> /product-owner -> /risk-review -> /architect -> /scrum-master (ready gate) -> /implement -> /qa -> /review -> merge`

Post-merge path:

`/tech-writer -> /chronicler -> /scrum-master (closeout)`

Release path:

`/release-manager`

### GitHub Automation (Guarded)

Agents support guarded direct writes for issue/project/PR operations.

- Preferred: GitHub MCP
- Fallback: `gh` CLI
- Guardrails: no auto-merge, no auto-release publish, no repo settings/security changes

Policy source: `docs/ops/github-automation-policy.md`

## AI Memory Design (Bounded Context Memory)

The project uses a layered memory system to prevent context-window bloat:

1. `docs/PROJECT_STATE.md` — bounded executive summary (read first)
2. `docs/ops/worklog/*` — atomic per-PR historical records
3. `docs/ops/summaries/*` — compressed weekly/release rollups
4. canonical docs (`CHANGELOG.md`, catalogs, ADRs, use-cases) for durable truth

Agent read order is enforced in `agent/shared.md` and `docs/AGENT_GUIDELINES.md`.

## Architecture Snapshot

- Backend: `apps/backend` (DDD + Clean Architecture + CQRS modular monolith)
- Web: `apps/web` (Next.js frontend)
- Shared packages: `packages/*`

Authoritative maps:

- `docs/architecture/REPO_MAP.md`
- `docs/architecture/backend/REPO_MAP.md`
- `docs/architecture/web/REPO_MAP.md`

## Requirements

- Node.js 24 LTS (`.nvmrc`)
- pnpm 10+
- Make (optional)

## Install/Enable pnpm

Preferred (uses Node's built-in Corepack):

```bash
corepack enable
corepack prepare pnpm@10.29.3 --activate
pnpm --version
```

Fallback (if Corepack is unavailable):

```bash
npm install -g pnpm@10.29.3
pnpm --version
```

## Setup

```bash
nvm use
pnpm install
```

## Scripts

- `make dev/backend` - run backend workspace dev (`apps/backend`)
- `make build/backend` - bundle backend entrypoint
- `make start/backend` - run backend built entrypoint
- `make typecheck/backend` - recursive workspace typecheck
- `make lint/backend` - recursive workspace lint
- `pnpm format` - Prettier write
- `pnpm test` - run backend tests
- `pnpm test:coverage` - backend test coverage
- `pnpm migrate:create -- <name>` - create backend migration
- `pnpm migrate:up` - apply backend migrations
- `pnpm migrate:down` - rollback backend migration

## Key Docs

- AI governance: `docs/AGENT_GUIDELINES.md`
- AI role system: `agent/README.md`
- Workflow stages: `docs/product/development-workflow.md`
- Memory system: `docs/PROJECT_STATE.md`, `docs/ops/`
- Release policy: `docs/RELEASE_CHECKLIST.md`, `CHANGELOG.md`
