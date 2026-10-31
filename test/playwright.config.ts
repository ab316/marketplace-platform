import { defineConfig, devices } from '@playwright/test';

/**
 * System E2E tests (ADR-010, TESTING_STRATEGY.md): browser → web app → backend → persistence.
 *
 * Deliberately repository-level, not inside `apps/web`: these journeys span both apps, and
 * keeping them here stops them being mistaken for frontend integration tests, which simulate
 * HTTP with MSW and live in `apps/web/test/integration`.
 *
 * The suite stays small. It covers critical buyer, seller, and operator journeys only.
 */
const WEB_URL = process.env['E2E_WEB_URL'] ?? 'http://localhost:4001';
const isCi = process.env['CI'] !== undefined;

// The started server must listen on the port the tests target, or `reuseExistingServer` will
// silently adopt whatever unrelated app already holds the default port and every test fails
// against the wrong application.
const WEB_PORT = new URL(WEB_URL).port !== '' ? new URL(WEB_URL).port : '4001';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.spec.ts',

  // A passing run must mean the product works, so a stray `test.only` fails CI rather than
  // silently shrinking the suite.
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  // Serial in CI so database-touching journeys cannot interfere; parallel locally.
  ...(isCi ? { workers: 1 } : {}),
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  /**
   * Starts the web app if it is not already running. The backend is started separately, because
   * it needs Postgres and its own migrations — see `e2e/README.md`.
   */
  webServer: {
    command: `pnpm --filter @acme/web exec next dev --port ${WEB_PORT}`,
    url: WEB_URL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
