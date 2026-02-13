# marketplace-platform

Minimal modular monolith backend environment scaffold with pnpm, TypeScript, and esbuild.

## Requirements

- Node.js 24 LTS (`.nvmrc`)
- pnpm 10+

## Setup

```bash
pnpm install
```

## Scripts

- `pnpm dev` - watch build and run `dist/index.js`
- `pnpm build` - bundle `src/index.ts` to `dist/index.js`
- `pnpm start` - run built entrypoint
- `pnpm typecheck` - TypeScript type check
- `pnpm lint` - ESLint
- `pnpm format` - Prettier write
- `pnpm test` - Mocha test runner (TS via `tsx` when tests exist)
- `pnpm test:coverage` - c8 coverage over tests
- `pnpm migrate:create -- <name>` - create migration
- `pnpm migrate:up` - apply migrations
- `pnpm migrate:down` - rollback migration
