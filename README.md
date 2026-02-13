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
