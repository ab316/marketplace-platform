import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { parseArgs, parseEnv } from 'node:util';

import {
  DEFAULT_PROJECT_NAME,
  DEFAULT_SESSION_COOKIE_NAME,
  PROJECT_NAME_PATTERN,
  SESSION_COOKIE_NAME_PATTERN,
  UnsafePathError,
  parsePort,
  readInside,
  toProjectName,
  toSessionCookieName,
  uniqueName,
  upsertEnv,
  writeInside,
} from './worktree-env-lib.ts';

/**
 * `pnpm env:init` — gives this checkout its own local stack, so several git worktrees can run side
 * by side without fighting over ports, containers, databases, or session cookies.
 *
 * It writes (or completes) the three env files the stack reads:
 *
 * - `.env` — `COMPOSE_PROJECT_NAME`, `POSTGRES_PORT`, `BACKEND_PORT`, `WEB_PORT`. Read by
 *   `docker compose` and `pnpm dev`.
 * - `apps/backend/.env` — `PORT` and `DATABASE_URL` matching the ports above (migrations and the
 *   seed read this file, not the root one). A new file also gets `PERSISTENCE=postgres`.
 * - `apps/web/.env.local` — in a linked worktree, its own `SESSION_COOKIE_NAME`: browsers scope
 *   cookies by host, not port, so two stacks on `localhost` sharing a name sign each other out.
 *
 * Re-running is safe: values already present are kept, unless another worktree uses them too or —
 * in a linked worktree — they are the main checkout's defaults. `--force` picks fresh values.
 *
 * New ports are a random block of three consecutive ports in 20000–32767 — below the ephemeral
 * ranges of Linux (32768+) and macOS (49152+) — that nothing is listening on and no other
 * worktree's `.env` has claimed, so a stopped stack keeps its ports too.
 */

const PORT_KEYS = ['POSTGRES_PORT', 'BACKEND_PORT', 'WEB_PORT'] as const;
type PortKey = (typeof PORT_KEYS)[number];
type Ports = Record<PortKey, number>;

const DEFAULT_PORTS: Ports = { POSTGRES_PORT: 5432, BACKEND_PORT: 4000, WEB_PORT: 4001 };
const RANDOM_PORT_RANGE = { min: 20_000, max: 32_767 } as const;
const MAX_ATTEMPTS = 200;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const files = {
  root: { target: '.env', example: '.env.example' },
  backend: { target: 'apps/backend/.env', example: 'apps/backend/.env.example' },
  web: { target: 'apps/web/.env.local', example: 'apps/web/.env.example' },
} as const;

type EnvFile = (typeof files)[keyof typeof files];
type Env = Record<string, string | undefined>;
type Write = { file: EnvFile; created: boolean; changedKeys: string[]; content: string };

// --- arguments ------------------------------------------------------------------------------------

const { values: flags } = parseArgs({
  options: {
    force: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    root: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (flags.help) {
  process.stdout.write(
    [
      'Usage: pnpm env:init [--force] [--dry-run] [--root <checkout>]',
      '',
      "Writes this checkout's .env, apps/backend/.env, and apps/web/.env.local with its own",
      'Docker Compose project, random ports, and session cookie name. Existing values are kept.',
      '',
      '  --force    pick new values even if they are already set',
      '  --dry-run  print what would change without writing anything',
      '  --root     configure another checkout of this repository (default: this one)',
      '',
    ].join('\n')
  );
  process.exit(0);
}

/** The checkout this script (and its trusted `docker-compose.yml`) comes from. */
const scriptRoot = path.resolve(import.meta.dirname, '..');

/**
 * The checkout being configured. `--root` lets the post-checkout hook configure a new worktree
 * with the script of the checkout that created it, so `git worktree add` never executes code from
 * the branch being checked out.
 */
const repoRoot = flags.root === undefined ? scriptRoot : path.resolve(flags.root);
if (!fs.existsSync(path.join(repoRoot, '.git'))) {
  process.stderr.write(`Not a git checkout: ${repoRoot}\n`);
  process.exit(1);
}

// --- helpers --------------------------------------------------------------------------------------

const git = (...args: string[]): string =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();

const realpath = (target: string): string | null => {
  try {
    return fs.realpathSync(target);
  } catch {
    return null;
  }
};

const readEnv = (root: string, relativePath: string): Env => {
  const text = readInside(root, relativePath);
  return text === null ? {} : parseEnv(text);
};

const canListen = (port: number, host: string): Promise<boolean> =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', (error: NodeJS.ErrnoException) => {
      // A host this machine does not have (e.g. no IPv6) cannot be in use either.
      resolve(error.code === 'EADDRNOTAVAIL' || error.code === 'EAFNOSUPPORT');
    });
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });

/**
 * Checked on loopback, all-IPv4, and all-IPv6 separately: Docker publishes on 127.0.0.1 while
 * Next.js listens on `::`, and the OS lets a specific and a wildcard bind coexist.
 */
const isPortFree = async (port: number): Promise<boolean> => {
  for (const host of ['127.0.0.1', '0.0.0.0', '::']) {
    // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: our own probes would collide
    if (!(await canListen(port, host))) return false;
  }
  return true;
};

/** The env files of every other worktree of this repository; unreadable ones are skipped. */
const otherWorktreeEnvs = (): { root: Env; web: Env }[] => {
  const self = realpath(repoRoot);
  return git('worktree', 'list', '--porcelain')
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length))
    .filter((worktree) => realpath(worktree) !== self && fs.existsSync(worktree))
    .flatMap((worktree) => {
      try {
        return [
          { root: readEnv(worktree, files.root.target), web: readEnv(worktree, files.web.target) },
        ];
      } catch {
        return [];
      }
    });
};

/**
 * The host port of this project's running Postgres container, if one is up. Uses this script's own
 * compose file, never the checked-out branch's.
 */
const runningPostgresPort = (projectName: string): number | undefined => {
  try {
    const output = execFileSync(
      'docker',
      [
        'compose',
        '--file',
        path.join(scriptRoot, 'docker-compose.yml'),
        '--project-name',
        projectName,
        'port',
        'postgres',
        '5432',
      ],
      { cwd: scriptRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10_000 }
    ).trim();
    return parsePort(output.slice(output.lastIndexOf(':') + 1));
  } catch {
    return undefined; // Docker not installed, not running, or no container for this project.
  }
};

/**
 * Fills the missing keys with consecutive ports from one random base, so a worktree's ports are
 * easy to recognize together. The main checkout tries the documented defaults first.
 */
const choosePorts = async (
  kept: Partial<Ports>,
  reserved: ReadonlySet<number>,
  preferDefaults: boolean
): Promise<Ports> => {
  const missing = PORT_KEYS.filter((key) => kept[key] === undefined);
  const taken = new Set([...reserved, ...Object.values(kept)]);

  const fits = async (candidates: readonly number[]): Promise<boolean> => {
    if (candidates.some((port) => taken.has(port))) return false;
    const free = await Promise.all(candidates.map(isPortFree));
    return free.every(Boolean);
  };

  const assign = (candidates: readonly number[]): Ports => {
    const pick = (key: PortKey): number => {
      const port = kept[key] ?? candidates[missing.indexOf(key)];
      if (port === undefined) throw new Error(`No port was chosen for ${key}.`);
      return port;
    };
    return {
      POSTGRES_PORT: pick('POSTGRES_PORT'),
      BACKEND_PORT: pick('BACKEND_PORT'),
      WEB_PORT: pick('WEB_PORT'),
    };
  };

  if (missing.length === 0) return assign([]);

  if (preferDefaults) {
    const defaults = missing.map((key) => DEFAULT_PORTS[key]);
    if (await fits(defaults)) return assign(defaults);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const base = randomInt(RANDOM_PORT_RANGE.min, RANDOM_PORT_RANGE.max - missing.length + 2);
    const candidates = missing.map((_, index) => base + index);
    // oxlint-disable-next-line no-await-in-loop -- each attempt runs only if the previous one failed
    if (await fits(candidates)) return assign(candidates);
  }

  throw new Error(
    `No free block of ${missing.length} ports found in ${RANDOM_PORT_RANGE.min}–${RANDOM_PORT_RANGE.max}.`
  );
};

const out = (line = ''): void => {
  process.stdout.write(`${line}\n`);
};

// --- main -----------------------------------------------------------------------------------------

const main = async (): Promise<void> => {
  const [gitDir, commonDir] = git(
    'rev-parse',
    '--path-format=absolute',
    '--git-dir',
    '--git-common-dir'
  ).split('\n');
  const isLinkedWorktree =
    gitDir !== undefined && commonDir !== undefined && realpath(gitDir) !== realpath(commonDir);
  const worktreeName = path.basename(repoRoot);

  const notes: string[] = [];
  const rootEnv = readEnv(repoRoot, files.root.target);
  const webEnv = readEnv(repoRoot, files.web.target);

  // What other worktrees already use stays theirs, even when copied into this one's files.
  const others = otherWorktreeEnvs();
  const takenProjects = new Set(
    others.map((env) => env.root['COMPOSE_PROJECT_NAME']?.trim() ?? '')
  );
  const takenCookies = new Set([
    DEFAULT_SESSION_COOKIE_NAME,
    ...others.map((env) => env.web['SESSION_COOKIE_NAME']?.trim() ?? ''),
  ]);
  const claimedPorts = new Set(
    others.flatMap((env) =>
      PORT_KEYS.map((key) => parsePort(env.root[key])).filter((port) => port !== undefined)
    )
  );

  // Project name.
  const existingProject = rootEnv['COMPOSE_PROJECT_NAME']?.trim();
  let projectName: string;
  if (!isLinkedWorktree) {
    projectName = existingProject ?? DEFAULT_PROJECT_NAME;
  } else if (
    !flags.force &&
    existingProject !== undefined &&
    PROJECT_NAME_PATTERN.test(existingProject) &&
    existingProject !== DEFAULT_PROJECT_NAME &&
    !takenProjects.has(existingProject)
  ) {
    projectName = existingProject;
  } else {
    if (existingProject !== undefined && takenProjects.has(existingProject)) {
      notes.push(
        `COMPOSE_PROJECT_NAME=${existingProject} belongs to another worktree; replacing it.`
      );
    }
    projectName = uniqueName(toProjectName(worktreeName), takenProjects, '-');
  }
  if (!PROJECT_NAME_PATTERN.test(projectName)) projectName = DEFAULT_PROJECT_NAME;

  // Ports: kept unless another worktree claims them, or they are the main checkout's defaults.
  const kept: Partial<Ports> = {};
  if (!flags.force) {
    for (const key of PORT_KEYS) {
      const port = parsePort(rootEnv[key]);
      if (port === undefined) continue;
      if (claimedPorts.has(port)) {
        notes.push(`${key}=${port} belongs to another worktree; replacing it.`);
      } else if (isLinkedWorktree && port === DEFAULT_PORTS[key]) {
        notes.push(`${key}=${port} is the main checkout's default; replacing it.`);
      } else {
        kept[key] = port;
      }
    }
  }

  // A Postgres container already running for this project keeps its port (and its data).
  if (kept.POSTGRES_PORT === undefined) {
    const running = runningPostgresPort(projectName);
    if (running !== undefined && !claimedPorts.has(running)) {
      kept.POSTGRES_PORT = running;
      notes.push(`Reusing port ${running} of the running "${projectName}" Postgres container.`);
    }
  }

  const keptKeys = new Set(Object.keys(kept));
  const ports = await choosePorts(kept, claimedPorts, !isLinkedWorktree);

  // Session cookie: the main checkout keeps whatever it has; a linked worktree needs its own.
  const existingCookie = webEnv['SESSION_COOKIE_NAME']?.trim();
  let sessionCookieName = existingCookie ?? DEFAULT_SESSION_COOKIE_NAME;
  if (
    isLinkedWorktree &&
    (flags.force ||
      existingCookie === undefined ||
      !SESSION_COOKIE_NAME_PATTERN.test(existingCookie) ||
      takenCookies.has(existingCookie))
  ) {
    sessionCookieName = uniqueName(toSessionCookieName(projectName), takenCookies, '_');
  }

  // --- env file contents --------------------------------------------------------------------------

  const plan = (file: EnvFile, updates: (existing: Env) => Record<string, string>): Write => {
    const current = readInside(repoRoot, file.target);
    const base = current ?? readInside(repoRoot, file.example) ?? '';
    const before = parseEnv(base);
    const changes = updates(before);
    const changedKeys = Object.keys(changes).filter((key) => before[key] !== changes[key]);
    return { file, created: current === null, changedKeys, content: upsertEnv(base, changes) };
  };

  const writes: Write[] = [
    plan(files.root, () => ({
      COMPOSE_PROJECT_NAME: projectName,
      POSTGRES_PORT: String(ports.POSTGRES_PORT),
      BACKEND_PORT: String(ports.BACKEND_PORT),
      WEB_PORT: String(ports.WEB_PORT),
    })),
    plan(files.backend, (env) => {
      const updates: Record<string, string> = { PORT: String(ports.BACKEND_PORT) };

      const databaseUrl = env['DATABASE_URL'];
      if (databaseUrl === undefined || databaseUrl.trim() === '') {
        updates['DATABASE_URL'] =
          `postgres://postgres:postgres@localhost:${ports.POSTGRES_PORT}/marketplace`;
      } else {
        try {
          const url = new URL(databaseUrl);
          if (LOCAL_HOSTS.has(url.hostname)) {
            url.port = String(ports.POSTGRES_PORT);
            updates['DATABASE_URL'] = url.toString();
          } else {
            notes.push(`apps/backend/.env DATABASE_URL points at ${url.host}; left unchanged.`);
          }
        } catch {
          notes.push('apps/backend/.env DATABASE_URL is not a valid URL; left unchanged.');
        }
      }

      if (readInside(repoRoot, files.backend.target) === null) {
        // A fresh worktree runs the real schema; the e2e suite needs rate-limit headroom.
        updates['PERSISTENCE'] = 'postgres';
        updates['RATE_LIMIT_MAX'] = '3000';
      } else if (env['PERSISTENCE'] !== 'postgres') {
        notes.push(
          'apps/backend/.env has PERSISTENCE=' +
            `${env['PERSISTENCE'] ?? '(unset)'}; set it to "postgres" to use the Compose database.`
        );
      }
      return updates;
    }),
    plan(files.web, () => (isLinkedWorktree ? { SESSION_COOKIE_NAME: sessionCookieName } : {})),
  ];

  // --- report and write ---------------------------------------------------------------------------

  out(
    `${flags['dry-run'] ? '[dry run] ' : ''}Local stack for "${worktreeName}" ` +
      `(${isLinkedWorktree ? 'linked worktree' : 'main checkout'})`
  );
  out();
  out(`  COMPOSE_PROJECT_NAME  ${projectName}${projectName === existingProject ? '' : '  (new)'}`);
  for (const key of PORT_KEYS) {
    out(`  ${key.padEnd(20)}  ${ports[key]}${keptKeys.has(key) ? '' : '  (new)'}`);
  }
  out(
    `  SESSION_COOKIE_NAME   ${sessionCookieName}${sessionCookieName === (existingCookie ?? DEFAULT_SESSION_COOKIE_NAME) ? '' : '  (new)'}`
  );
  out();

  for (const write of writes) {
    const status = write.created
      ? 'create'
      : write.changedKeys.length > 0
        ? `update (${write.changedKeys.join(', ')})`
        : 'unchanged';
    out(`  ${write.file.target.padEnd(20)}  ${status}`);
    if (!flags['dry-run'] && (write.created || write.changedKeys.length > 0)) {
      writeInside(repoRoot, write.file.target, write.content);
    }
  }

  if (notes.length > 0) {
    out();
    for (const note of notes) out(`  note: ${note}`);
  }

  out();
  out('Start the stack:');
  out('  docker compose up -d --wait postgres');
  out('  pnpm migrate:up');
  out(
    `  pnpm dev     # web http://localhost:${ports.WEB_PORT}, backend http://localhost:${ports.BACKEND_PORT}`
  );
  out('  pnpm seed    # optional: the standing dev cast');
};

try {
  await main();
} catch (error) {
  if (!(error instanceof UnsafePathError)) throw error;
  process.stderr.write(`env:init: ${error.message}\n`);
  process.exit(1);
}
