# marketplace-platform

A multi-tenant marketplace where organizations can list assets/services, buyers can make offers, and the platform handles payments, order fulfillment, disputes, refunds, and settlement—with strong guarantees that you never double-charge, never double-settle, and can always audit what happened.
The key challenge: the system spans multiple concerns that are hard in real life:

- money movement (Stripe or simulated PSP)
- asynchronous workflows (payment → escrow → fulfillment → settlement)
- partial failures (network errors, retries, duplicate events)
- cross-service consistency (eventual consistency + correctness)
- auditability (who did what, when, and why)

It is solved with DDD + Clean Architecture + event-driven microservices, starting as a modular monolith and evolving into microservices without rewriting the core domain.

**Core challenges solved**

- financial correctness & auditability
- distributed workflows & eventual consistency
- resilience & failure recovery
- user trust & dispute handling
- scalability & observability
- developer productivity & operability

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

## Requirements

- Node.js 24 LTS (`.nvmrc`)
- pnpm 10+
- Make (optional)

## Setup

```bash
nvm use
pnpm install
```

## VS Code

- Install recommended workspace extensions when prompted.
- On save: ESLint auto-fixes and Prettier formats files via `.vscode/settings.json`.

## AI-First Development

This repository is optimized for solo-development using AI agents. We use a role-based workflow system:

1.  **Slash Commands**: In the IDE, type `/` to see available roles (e.g., `/product-owner`, `/architect`).
2.  **Role Pipeline**: `Product Owner` → `CTO` → `Architect` → `Implementer` → `QA` → `Reviewer`.
3.  **Guidelines**: All agents follow the rules in [`docs/AGENT_GUIDELINES.md`](docs/AGENT_GUIDELINES.md).

See [**`agent/README.md`**](agent/README.md) for the full guide on how to leverage these agents.

## Scripts

- `make dev/backend` - run backend workspace dev (`apps/backend`)
- `make build/backend` - bundle backend `apps/backend/src/index.ts` to `apps/backend/dist/index.js`
- `make start/backend` - run backend built entrypoint (`apps/backend/dist/index.js`)
- `make typecheck/backend` - recursive workspace typecheck
- `make lint/backend` - recursive workspace lint
- `pnpm format` - Prettier write
- `pnpm test` - run backend tests
- `pnpm test:coverage` - backend test coverage
- `pnpm migrate:create -- <name>` - create backend migration
- `pnpm migrate:up` - apply backend migrations
- `pnpm migrate:down` - rollback backend migration
