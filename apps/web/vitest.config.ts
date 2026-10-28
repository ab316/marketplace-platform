import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Frontend unit and integration tests (ADR-010). Integration tests simulate the backend at the
 * HTTP boundary with MSW so the real data layer and the real `@acme/api-contracts` schemas run;
 * they are not E2E tests. Browser-to-backend journeys live in the repository-level `test/e2e`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Honours the `@/*` paths in tsconfig.json natively; no plugin needed.
    tsconfigPaths: true,
    alias: {
      // `server-only` throws by design when imported outside a server environment. Under Vitest
      // we are deliberately testing those server modules directly, so it resolves to a no-op.
      // The guard still protects real builds, which is where it matters.
      'server-only': new URL('./test/stubs/server-only.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    css: false,
    // Locations and suffixes follow TESTING_STRATEGY.md §10.
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['test/unit/**/*.unit.spec.ts'] },
      },
      {
        extends: true,
        test: { name: 'component', include: ['test/component/**/*.component.spec.tsx'] },
      },
      {
        extends: true,
        test: { name: 'integration', include: ['test/integration/**/*.feature.int.spec.{ts,tsx}'] },
      },
    ],
  },
});
