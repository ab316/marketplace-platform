# System E2E Tests

This directory contains the small suite of critical journeys through the complete runnable product: browser, web app, backend, and owned infrastructure.

Backend-only multi-step tests belong in `apps/backend/test/integration/workflows`. Frontend tests that simulate HTTP belong in `apps/web/test/integration`; neither is called E2E.

Use the `*.e2e.spec.ts` suffix. See `docs/TESTING_STRATEGY.md` for selection, substitution, assertion, and CI policy.
