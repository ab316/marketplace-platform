import { spawn } from 'node:child_process';
import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isRun = process.argv.includes('--run');

let appProcess;

const stopApp = () => {
  if (!appProcess) {
    return;
  }

  appProcess.kill('SIGTERM');
  appProcess = undefined;
};

const runOnSuccessPlugin = {
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

const options = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node24'],
  packages: 'external',
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
