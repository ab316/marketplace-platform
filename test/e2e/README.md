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

The config starts the web app on port 4001 itself and reuses an already-running one locally. The **backend is
not started for you** — it needs Postgres and its migrations applied. Start it in another shell
(`pnpm run dev`) before running journeys that reach it.

Point the suite at a different deployment with `E2E_WEB_URL`. Journeys that seed data through the
API read `E2E_API_URL` (default `http://localhost:4000`); it must be the backend the web app under
test talks to. Both are read only in `playwright.config.ts` and reach specs as fixtures
(`e2e/fixtures.ts`).

## Current coverage

- `shell.e2e.spec.ts` — the application shell: server-rendered HTML, skip link, footer navigation,
  theme switching, and the not-found route.
- `auth.e2e.spec.ts` — UC-002: sign-up with auto sign-in, httpOnly session cookie, sign-out,
  the generic invalid-credentials failure, and the `next` redirect. Requires the backend.
- `seller-organization.e2e.spec.ts` — UC-003 C1–C3: the protected `/seller/setup` route, sign-up
  → footer "Sell on Acme Tech" → create the organization → the seller home and header identity,
  then sign-in landing on the seller home. Requires
  the backend.
- `seller-listings.e2e.spec.ts` — UC-007 and UC-008: sign-up → organization → empty listing list →
  create a draft (empty submit rejected) → a buyer cannot find it → publish → found in the
  catalogue by keyword → archive (dialog cancelled, then confirmed) → gone from the catalogue,
  listed as Archived for the seller; plus the protected `/seller/listings` route. Requires the
  backend.

Buyer, seller, and operator journeys are added alongside their use cases (UC-001, UC-004, UC-005)
in Phase 6.
