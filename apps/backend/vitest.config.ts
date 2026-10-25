import { transform } from 'esbuild';
import { type Plugin, defineConfig } from 'vitest/config';

// Compile TypeScript with esbuild, the production compiler, instead of Vite's default Oxc.
// Oxc does not lower standard decorators (oxc-project/oxc#9170), and Node cannot run them natively,
// so decorated classes would fail under test while passing in the esbuild bundle (ADR-007).
// Transform mode ignores tsconfig.json, so options that change emitted code are passed explicitly.
const esbuildTypeScriptPlugin: Plugin = {
  name: 'esbuild-typescript',
  async transform(code, id) {
    if (!/\.[cm]?ts$/.test(id.split('?')[0] ?? '')) {
      return null;
    }

    const result = await transform(code, {
      loader: 'ts',
      format: 'esm',
      target: 'node26',
      sourcemap: true,
      sourcefile: id,
      tsconfigRaw: {
        compilerOptions: { verbatimModuleSyntax: true, useDefineForClassFields: true },
      },
    });
    return { code: result.code, map: result.map };
  },
};

/**
 * Integration tests run against real Postgres by default (TESTING_STRATEGY §4): a Testcontainers
 * Postgres is started once per run and every test file gets its own migrated database.
 * `TEST_PERSISTENCE=memory` opts into in-process persistence for a fast, Docker-free run.
 */
const persistence = process.env['TEST_PERSISTENCE'] === 'memory' ? 'memory' : 'postgres';

export default defineConfig({
  oxc: false,
  plugins: [esbuildTypeScriptPlugin],
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{test,spec}.ts'],
      reporter: ['text', 'lcov'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.{test,spec}.ts', 'test/contract/**/*.{test,spec}.ts'],
          provide: { persistence },
          globalSetup: persistence === 'postgres' ? ['test/setup/postgres-global-setup.ts'] : [],
          setupFiles: ['test/setup/integration-setup.ts'],
        },
      },
    ],
  },
});
