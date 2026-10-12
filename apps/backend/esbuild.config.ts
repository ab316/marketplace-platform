import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import { rmSync, writeFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';

import { type BuildOptions, type Plugin, build, context } from 'esbuild';

import packageJson from './package.json' with { type: 'json' };

const isWatch = process.argv.includes('--watch');
const isRun = process.argv.includes('--run');

let appProcess: ChildProcess | undefined;

// Wait for the previous instance to exit so restarts never overlap (port, outbox pollers).
const stopApp = async () => {
  const previous = appProcess;
  appProcess = undefined;
  if (!previous || previous.exitCode !== null || previous.signalCode !== null) {
    return;
  }

  const exited = once(previous, 'exit');
  previous.kill('SIGTERM');
  await exited;
};

const runOnSuccessPlugin: Plugin = {
  name: 'run-on-success',
  setup(buildApi) {
    buildApi.onEnd(async (result) => {
      if (result.errors.length > 0) {
        return;
      }

      await stopApp();
      appProcess = spawn(process.execPath, ['--enable-source-maps', 'dist/index.js'], {
        stdio: 'inherit',
      });
    });
  },
};

// Bundle workspace packages from source; keep every third-party import external so it resolves
// from node_modules at runtime (required for OpenTelemetry instrumentation). A third-party import
// the backend does not declare would not resolve in a pruned production install, so fail the build.
const declaredDependencies = new Set(Object.keys(packageJson.dependencies));

const getPackageName = (specifier: string) =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

const externalizeThirdPartyPlugin: Plugin = {
  name: 'externalize-third-party',
  setup(buildApi) {
    buildApi.onResolve({ filter: /^[^./]/ }, ({ path }) => {
      if (path.startsWith('@acme/') || isBuiltin(path)) {
        return undefined;
      }

      const packageName = getPackageName(path);
      if (!declaredDependencies.has(packageName)) {
        return {
          errors: [
            { text: `"${packageName}" is imported but not declared in @acme/backend dependencies` },
          ],
        };
      }

      return { path, external: true };
    });
  },
};

const options: BuildOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node26'],
  sourcemap: true,
  minify: false,
  keepNames: true,
  logLevel: 'info',
  plugins: [externalizeThirdPartyPlugin, ...(isRun ? [runOnSuccessPlugin] : [])],
};

// esbuild never removes outputs, so start from an empty directory.
rmSync('dist', { recursive: true, force: true });

if (!isWatch) {
  const result = await build({ ...options, metafile: true });
  writeFileSync('dist/meta.json', JSON.stringify(result.metafile));
  process.exit(0);
}

const ctx = await context(options);
await ctx.watch();

const shutdown = async () => {
  await stopApp();
  await ctx.dispose();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
