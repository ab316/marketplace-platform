# System E2E Tests

This directory contains the small suite of critical journeys through the complete runnable product: browser, web app, backend, and owned infrastructure.

Backend-only multi-step tests belong in `apps/backend/test/integration/workflows`. Frontend tests that simulate HTTP belong in `apps/web/test/integration`; neither is called E2E.

Use the `*.e2e.spec.ts` suffix. See `docs/TESTING_STRATEGY.md` for selection, substitution, assertion, and CI policy.

## Running

Playwright is configured at the repository root (`test/playwright.config.ts`), per ADR-010.

```bash
pnpm run test:e2e:install   # once: downloads the Chromium build
pnpm run test:e2e
```

The config starts the web app on port 3001 itself and reuses an already-running one locally. The **backend is
not started for you** — it needs Postgres and its migrations applied. Start it in another shell
(`pnpm run dev`) before running journeys that reach it.

Point the suite at a different deployment with `E2E_WEB_URL`.

## Current coverage

- `shell.e2e.spec.ts` — the application shell: server-rendered HTML, skip link, navigation,
  theme switching, and the not-found route. This is the only journey that exists before any
  marketplace feature does.

Buyer, seller, and operator journeys are added alongside their use cases (UC-001, UC-004, UC-005)
in Phase 6.
