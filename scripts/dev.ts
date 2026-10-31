import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

/**
 * Local dev orchestrator: runs the backend and the web app in one terminal with prefixed output.
 *
 * Ports come from the repo-root `.env` (`BACKEND_PORT`, `WEB_PORT`); already-exported shell
 * variables take precedence, so `BACKEND_PORT=5000 pnpm dev` works as a one-off override. The
 * backend port is forwarded to the web app as `BACKEND_API_URL`, so the two cannot drift.
 */

const repoRoot = path.resolve(import.meta.dirname, '..');
const envFile = path.join(repoRoot, '.env');

if (fs.existsSync(envFile)) {
  // Same semantics as `node --env-file`: variables already set in the shell win over the file.
  process.loadEnvFile(envFile);
}

const backendPort = process.env['BACKEND_PORT'] ?? '4000';
const webPort = process.env['WEB_PORT'] ?? '4001';

type App = {
  name: string;
  filter: string;
  /** ANSI colour code for the output prefix. */
  color: number;
  env: Record<string, string>;
};

const apps: App[] = [
  {
    name: 'backend',
    filter: '@acme/backend',
    color: 36, // cyan
    env: { PORT: backendPort },
  },
  {
    name: 'web',
    filter: '@acme/web',
    color: 35, // magenta
    env: {
      PORT: webPort,
      BACKEND_API_URL: process.env['BACKEND_API_URL'] ?? `http://localhost:${backendPort}`,
    },
  },
];

const prefixWidth = Math.max(...apps.map((app) => app.name.length));
const useColor = process.stdout.isTTY;

const prefixFor = (app: App): string => {
  const label = app.name.padEnd(prefixWidth);
  return useColor ? `\u001B[${app.color}m${label}\u001B[0m │ ` : `${label} │ `;
};

const children: ChildProcess[] = [];
let shuttingDown = false;

const shutdown = (exitCode: number): void => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
    }
  }

  // Give children a moment to exit cleanly before the parent leaves.
  setTimeout(() => process.exit(exitCode), 500).unref();
};

for (const app of apps) {
  const child = spawn('pnpm', ['--filter', app.filter, 'dev'], {
    cwd: repoRoot,
    env: { ...process.env, ...app.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  children.push(child);

  const prefix = prefixFor(app);

  for (const stream of [child.stdout, child.stderr]) {
    readline.createInterface({ input: stream }).on('line', (line) => {
      process.stdout.write(`${prefix}${line}\n`);
    });
  }

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    process.stdout.write(
      `${prefix}exited (${signal ?? `code ${code ?? 0}`}) — stopping the stack\n`
    );
    shutdown(code ?? 1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

process.stdout.write(
  `dev stack starting — backend http://localhost:${backendPort}, web http://localhost:${webPort}\n`
);
