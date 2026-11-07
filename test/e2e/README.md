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

Point the suite at a different deployment with `E2E_WEB_URL`, and at a backend on another port
with `E2E_API_URL` (both matter when several worktrees of this repo run their own stacks).

The whole suite in one go exceeds the backend's default rate limit (300 requests per minute per
IP), because every page render makes its own server-side calls from the same address. It
surfaces as an unrelated-looking auth or seller journey failing mid-run. Give the backend more
headroom for local runs — `RATE_LIMIT_MAX=3000` in `apps/backend/.env` — or re-run the affected
spec on its own a minute later.

## Current coverage

- `shell.e2e.spec.ts` — the application shell: server-rendered HTML, skip link, footer navigation,
  theme switching, and the not-found route.
- `auth.e2e.spec.ts` — UC-002: sign-up with auto sign-in, httpOnly session cookie, sign-out,
  the generic invalid-credentials failure, and the `next` redirect. Requires the backend.
- `seller-organization.e2e.spec.ts` — UC-003 C1–C3: the protected `/seller/setup` route, sign-up
  → footer "Sell on Acme Tech" → create the organization → the seller home and header identity,
  then sign-in landing on the seller home. Requires
  the backend.
- `seller-listings.e2e.spec.ts` — UC-005, UC-007–UC-010: a new seller saves a half-finished draft,
  sees it in `/seller/listings` with what is missing, completes it, publishes it after confirming,
  finds it in the catalogue, then archives it and it leaves the catalogue. Requires the backend.
- `listing-detail.e2e.spec.ts` — UC-012: an anonymous buyer opens a catalogue result, reads the
  whole listing including who is selling it, and returns to the same search; an archived listing
  still reads but is out of the catalogue, and an unknown one is simply not available. Requires
  the backend.

Buyer, seller, and operator journeys are added alongside their use cases (UC-001 and UC-004, the seller
listing use cases UC-005 and UC-007–UC-010, and later the fulfillment use cases) in Phase 6.
