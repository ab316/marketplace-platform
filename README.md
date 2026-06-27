# marketplace-platform

A multi-tenant marketplace platform with first-class buyer, seller, and operator experiences. Organizations can list assets/services, buyers can make offers, and the platform handles payments, order fulfillment, disputes, refunds, and settlement with strong guarantees that you never double-charge, never double-settle, and can always audit what happened.

The key challenge: the system spans product and engineering concerns that are hard in real life:

- usable frontend workflows for different marketplace roles
- trust, status, and transparency in the user experience
- money movement (Stripe or simulated PSP)
- asynchronous workflows (payment → escrow → fulfillment → settlement)
- partial failures (network errors, retries, duplicate events)
- cross-service consistency (eventual consistency + correctness)
- auditability (who did what, when, and why)

It is built as a monorepo with a Next.js frontend direction, shared API contracts, and a DDD/Clean Architecture backend starting as a modular monolith.

## What This Project Optimizes For

- financial correctness and auditability
- useful, polished frontend workflows
- accessibility and clear user states
- safe asynchronous workflows (outbox, idempotency, replay tolerance)
- solo-founder leverage through AI-assisted discovery, implementation, and review
- concise project memory for decisions and current direction

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

- Frontend workflows for buyer/seller/operator roles
- Accessible, state-complete UI
- Trust & transparency flows
- Analytics & experimentation
- AI-powered features

## AI Operating Model

This repository is set up for AI-assisted solo development. AI should help with product discovery, implementation, testing, review, and documentation while the human owner keeps control of product direction, architecture tradeoffs, and release decisions.

Default loop:

`discover -> decide -> design -> build -> review -> record`

Canonical docs:

- `docs/AI_OPERATING_MODEL.md` - solo-founder workflow, risk tiers, memory policy
- `docs/AGENT_GUIDELINES.md` - architectural and safety rules
- `docs/product/discovery.md` - living product discovery workspace

### Role-Based Agent System

Roles are defined in `agent/*.md` and invoked via `.agents/workflows/*.md` slash commands. Treat them as reusable lenses, not a mandatory team simulation:

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

See `agent/README.md` for full role behavior.

Use the full multi-role sequence only for high-risk work such as payments, ledger, settlement, refunds, outbox/messaging, idempotency, and concurrency-sensitive state transitions.

### GitHub Automation (Guarded)

Agents support guarded direct writes for issue/project/PR operations.

- Preferred: GitHub MCP
- Fallback: `gh` CLI
- Guardrails: no auto-merge, no auto-release publish, no repo settings/security changes

Policy source: `docs/ops/github-automation-policy.md`

## Project Memory

The project keeps memory deliberately small:

1. `docs/PROJECT_STATE.md` - bounded current-state summary
2. canonical docs (`docs/product/`, ADRs, architecture docs, `CHANGELOG.md`) - durable truth
3. `docs/ops/worklog/*` - significant merged changes or decisions only
4. `docs/ops/summaries/*` - optional compression if worklog volume grows

Do not preserve transcript-level detail unless it explains a decision that would otherwise be lost.

## Architecture Snapshot

- Backend: `apps/backend` (intended DDD + Clean Architecture + CQRS modular monolith; currently scaffold-level)
- Web: `apps/web` (intended Next.js frontend; currently placeholder package)
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

Frontend scripts will be added when `apps/web` is initialized as a Next.js app.

## Key Docs

- AI governance: `docs/AGENT_GUIDELINES.md`
- AI role system: `agent/README.md`
- Operating model: `docs/AI_OPERATING_MODEL.md`
- Workflow: `docs/product/development-workflow.md`
- Product discovery: `docs/product/discovery.md`
- Project memory: `docs/PROJECT_STATE.md`, `docs/ops/`
- Release policy: `docs/RELEASE_CHECKLIST.md`, `CHANGELOG.md`
