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

- Node.js (`.nvmrc`; pnpm scripts run on the pinned version via `devEngines`, downloading it if needed)
- pnpm (switches to the `packageManager` version automatically)
- Make (optional)

## Setup

```bash
nvm install
nvm use
npm install --global pnpm
pnpm install
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
```

Then `pnpm dev` starts the **whole stack** — backend and web app — in one terminal, with prefixed
output. Ctrl-C stops both.

| App     | Default URL             | Port comes from               |
| ------- | ----------------------- | ----------------------------- |
| Backend | `http://localhost:4000` | `BACKEND_PORT` in root `.env` |
| Web     | `http://localhost:4001` | `WEB_PORT` in root `.env`     |

Port 3000 is deliberately unused — it collides with too many other tools. If 4000/4001 are also
taken on your machine, change them in the root `.env` and nothing else: `pnpm dev` passes the
backend port through to the web app as `BACKEND_API_URL`, so the two cannot drift. A one-off
override works too: `BACKEND_PORT=5000 pnpm dev`.

Run one app on its own with `pnpm dev:backend` or `pnpm dev:web`.

The backend defaults to `PERSISTENCE=memory`, so it runs with no external dependencies. For the
real schema, start Postgres with `docker compose up -d postgres`, set `PERSISTENCE=postgres` in
`apps/backend/.env`, and run `pnpm migrate:up`. Both the backend and migration commands
load `apps/backend/.env` automatically; exported shell variables take precedence.

To walk the first use case with curl, see
[the API guide](apps/backend/src/api/README.md).

## Scripts

- `make dev/backend` — run backend workspace dev (`apps/backend`)
- `make build/backend` — bundle backend entrypoint
- `make start/backend` — run backend built entrypoint
- `make typecheck/backend` — recursive workspace typecheck
- `make lint/backend` — Oxlint + module-boundary check
- `pnpm format` — Oxfmt write
- `pnpm format:check` — Oxfmt formatting check
- `pnpm test` / `pnpm test:coverage` — backend and frontend tests / backend coverage; integration tests start a Postgres container through Testcontainers, so Docker must be running
- `pnpm test:memory` — the same suite over in-memory persistence, with no Docker (fast local loop)
- `pnpm test:unit` — unit tests only
- `pnpm migrate:create -- <name>` / `pnpm migrate:up` / `pnpm migrate:down` — backend migrations

Frontend scripts will be added when `apps/web` is initialized as a Next.js app.

## Key docs

- **How to work here (single guide + bootstrap):** [`AGENTS.md`](AGENTS.md)
- **Using the AI agents (with examples):** [`docs/working-with-ai-agents.md`](docs/working-with-ai-agents.md)
- **Engineering rules & invariants:** [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md)
- **Roadmap (what's building & next):** [`docs/product/roadmap.md`](docs/product/roadmap.md)
- **Current project state:** [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)
- **Full documentation index:** [`docs/README.md`](docs/README.md)

## License

This project is licensed under the [MIT License](LICENSE).
