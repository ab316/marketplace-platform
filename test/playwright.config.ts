import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

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

/**
 * The suite targets this checkout's own stack: the ports come from the repo-root `.env` that
 * `pnpm env:init` writes, the same file `pnpm dev` reads, so a worktree never tests (or writes test
 * data into) another worktree's stack. Exported shell variables still win, and `E2E_WEB_URL` /
 * `E2E_API_URL` point the suite somewhere else entirely. Playwright re-evaluates this file in each
 * worker, so the specs see the same values.
 */
const repoRoot = path.resolve(import.meta.dirname, '..');
const readEnvFile = (relativePath: string): Record<string, string | undefined> => {
  const absolute = path.join(repoRoot, relativePath);
  return fs.existsSync(absolute) ? parseEnv(fs.readFileSync(absolute, 'utf8')) : {};
};

const rootEnv = readEnvFile('.env');
const webPort = process.env['WEB_PORT'] ?? rootEnv['WEB_PORT'] ?? '4001';
const backendPort = process.env['BACKEND_PORT'] ?? rootEnv['BACKEND_PORT'] ?? '4000';

// The local cookie name only describes the local web app, not a deployment E2E_WEB_URL points at.
const targetsLocalWeb = process.env['E2E_WEB_URL'] === undefined;
process.env['E2E_WEB_URL'] ??= `http://localhost:${webPort}`;
process.env['E2E_API_URL'] ??= `http://localhost:${backendPort}`;
process.env['SESSION_COOKIE_NAME'] ??=
  (targetsLocalWeb ? readEnvFile('apps/web/.env.local')['SESSION_COOKIE_NAME'] : undefined) ??
  'marketplace_session';

const WEB_URL = process.env['E2E_WEB_URL'];
const API_URL = process.env['E2E_API_URL'];
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
   * Starts the web app if it is not already running, wired to the same backend the specs seed
   * through. The backend is started separately, because it needs Postgres and its own
   * migrations — see `e2e/README.md`.
   */
  webServer: {
    command: `pnpm --filter @acme/web exec next dev --port ${WEB_PORT}`,
    env: { BACKEND_API_URL: API_URL },
    url: WEB_URL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
