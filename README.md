# marketplace-platform

Minimal modular monolith backend environment scaffold with pnpm, TypeScript, and esbuild.

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
