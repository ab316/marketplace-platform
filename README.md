# marketplace-platform

A multi-tenant marketplace platform with first-class buyer, seller, and operator experiences. Organizations list assets/services, buyers make offers, and the platform handles payments, order fulfillment, disputes, refunds, and settlement with strong guarantees: never double-charge, never double-settle, always auditable.

The repo holds **everything about the product** — code, documentation, design references, decisions, roadmap, and history — and is built for **solo-founder, AI-assisted development**.

> **New here, or back after a break? Start with [`AGENTS.md`](AGENTS.md).**
> It's the single guide to how this repo works: the development loop, when to slow down, the agent roles, project memory, and where everything lives.

## What this optimizes for

- Financial correctness and auditability.
- Polished, accessible product workflows for buyer/seller/operator roles.
- Safe asynchronous workflows (outbox, idempotency, replay tolerance).
- Solo-founder leverage through AI-assisted discovery, implementation, and review.
- Small, durable project memory for decisions and current direction.

It is a single product implemented as a pnpm monorepo: an `apps/` layer (backend service + web app) over shared `packages/*`. The architecture follows DDD, Clean Architecture, and an event-driven modular monolith; the rules are in [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md).

## Requirements

- Node.js 24 LTS (`.nvmrc`)
- pnpm 10+
- Make (optional)

## Setup

Enable pnpm via Corepack (Node's built-in), then install:

```bash
corepack enable
corepack prepare pnpm@10.29.3 --activate   # or: npm install -g pnpm@10.29.3
nvm use
pnpm install
```

## Scripts

- `make dev/backend` — run backend workspace dev (`apps/backend`)
- `make build/backend` — bundle backend entrypoint
- `make start/backend` — run backend built entrypoint
- `make typecheck/backend` — recursive workspace typecheck
- `make lint/backend` — recursive workspace lint
- `pnpm format` — Prettier write
- `pnpm test` / `pnpm test:coverage` — backend tests / coverage
- `pnpm migrate:create -- <name>` / `pnpm migrate:up` / `pnpm migrate:down` — backend migrations

Frontend scripts will be added when `apps/web` is initialized as a Next.js app.

## Key docs

- **How to work here (single guide + bootstrap):** [`AGENTS.md`](AGENTS.md)
- **Using the AI agents (with examples):** [`docs/working-with-ai-agents.md`](docs/working-with-ai-agents.md)
- **Engineering rules & invariants:** [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md)
- **Roadmap (what's building & next):** [`docs/product/roadmap.md`](docs/product/roadmap.md)
- **Current project state:** [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)
- **Full documentation index:** [`docs/README.md`](docs/README.md)
