import { type ChildProcess, spawn } from 'node:child_process';
import { type BuildOptions, type Plugin, build, context } from 'esbuild';
import packageJson from './package.json' with { type: 'json' };

const isWatch = process.argv.includes('--watch');
const isRun = process.argv.includes('--run');

let appProcess: ChildProcess | undefined;

const stopApp = () => {
  if (!appProcess) {
    return;
  }

  appProcess.kill('SIGTERM');
  appProcess = undefined;
};

const runOnSuccessPlugin: Plugin = {
  name: 'run-on-success',
  setup(buildApi) {
    buildApi.onEnd((result) => {
      if (!isRun || result.errors.length > 0) {
        return;
      }

      stopApp();
      appProcess = spawn(process.execPath, ['--enable-source-maps', 'dist/index.js'], {
        stdio: 'inherit',
      });
    });
  },
};

// Bundle workspace packages from source; keep third-party dependencies external.
const external = Object.keys(packageJson.dependencies).filter((name) => !name.startsWith('@acme/'));

const options: BuildOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node26'],
  external,
  sourcemap: true,
  minify: false,
  logLevel: 'info',
  plugins: isRun ? [runOnSuccessPlugin] : [],
};

if (!isWatch) {
  await build(options);
  process.exit(0);
}

const ctx = await context(options);
await ctx.watch();

const shutdown = async () => {
  stopApp();
  await ctx.dispose();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
