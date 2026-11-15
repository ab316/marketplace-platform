import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { parseEnv } from 'node:util';

import {
  UnsafePathError,
  readInside,
  toProjectName,
  toSessionCookieName,
  uniqueName,
  upsertEnv,
  writeInside,
} from './worktree-env-lib.ts';

/**
 * `pnpm env:init`: the pure helpers, then the real command against throwaway git repositories.
 * Run with `pnpm test:scripts`.
 */

const repoRoot = path.resolve(import.meta.dirname, '..');
const script = path.join(repoRoot, 'scripts', 'worktree-env.ts');
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'worktree-env-test-'));

after(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

const git = (cwd: string, ...args: string[]): void => {
  execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd, stdio: 'ignore' });
};
const run = (worktree: string) =>
  spawnSync('node', [script, '--root', worktree], { encoding: 'utf8' });
const env = (worktree: string, file: string) =>
  parseEnv(fs.readFileSync(path.join(worktree, file), 'utf8'));

void describe('names', () => {
  void it('derives a Compose project name from the worktree folder', () => {
    assert.equal(toProjectName('Feature X!'), 'marketplace-feature-x');
    assert.equal(toProjectName('---'), 'marketplace-worktree');
  });

  void it('derives a cookie name, and uniqueName keeps look-alikes apart', () => {
    const dashed = toSessionCookieName('marketplace-feat-x');
    assert.equal(dashed, 'marketplace_session_feat_x');
    // `feat_x` maps to the same cookie as `feat-x`; the taken set disambiguates.
    assert.equal(
      uniqueName(toSessionCookieName('marketplace-feat_x'), new Set([dashed]), '_'),
      'marketplace_session_feat_x_2'
    );
    assert.ok(toSessionCookieName(`marketplace-${'x'.repeat(100)}`).length <= 60);
  });
});

void describe('upsertEnv', () => {
  void it('replaces every occurrence in place and appends missing keys', () => {
    const result = upsertEnv('# comment\nA=1\nB=2\nA=3\n', { A: 'x', C: 'y' });
    assert.equal(result, '# comment\nA=x\nB=2\nA=x\n\nC=y\n');
  });

  void it('keeps `export` prefixes and CRLF line endings', () => {
    assert.equal(upsertEnv('export A=1\r\nB=2\r\n', { A: 'x' }), 'export A=x\r\nB=2\r\n');
    assert.equal(upsertEnv('A=1\r\n', { B: 'y' }), 'A=1\r\n\r\nB=y\r\n');
  });
});

void describe('readInside / writeInside', () => {
  const root = fs.mkdtempSync(path.join(sandbox, 'files-'));
  const outside = path.join(sandbox, 'outside-target');

  void it('writes and reads plain files, creating new ones private to the user', () => {
    writeInside(root, '.env', 'A=1\n');
    assert.equal(readInside(root, '.env'), 'A=1\n');
    assert.equal(fs.statSync(path.join(root, '.env')).mode & 0o777, 0o600);
    assert.equal(readInside(root, 'missing.env'), null);
  });

  void it('refuses a dangling symlink instead of creating its target', () => {
    fs.symlinkSync(outside, path.join(root, 'dangling.env'));
    assert.throws(() => writeInside(root, 'dangling.env', 'X=1\n'), UnsafePathError);
    assert.throws(() => readInside(root, 'dangling.env'), UnsafePathError);
    assert.equal(fs.existsSync(outside), false);
  });

  void it('refuses a symlinked parent directory and paths that leave the root', () => {
    fs.mkdirSync(path.join(sandbox, 'elsewhere'));
    fs.symlinkSync(path.join(sandbox, 'elsewhere'), path.join(root, 'apps'));
    assert.throws(() => writeInside(root, 'apps/.env', 'X=1\n'), UnsafePathError);
    assert.equal(fs.existsSync(path.join(sandbox, 'elsewhere', '.env')), false);
    assert.throws(() => writeInside(root, '../escape.env', 'X=1\n'), UnsafePathError);
  });
});

void describe('pnpm env:init in a worktree', () => {
  const main = path.join(sandbox, 'main');
  const addWorktree = (name: string): string => {
    const worktree = path.join(sandbox, name);
    git(main, 'worktree', 'add', '-q', worktree);
    return worktree;
  };

  fs.mkdirSync(path.join(main, 'apps', 'backend'), { recursive: true });
  fs.mkdirSync(path.join(main, 'apps', 'web'), { recursive: true });
  for (const file of ['.env.example', 'apps/backend/.env.example', 'apps/web/.env.example']) {
    fs.copyFileSync(path.join(repoRoot, file), path.join(main, file));
  }
  git(main, 'init', '-q');
  git(main, 'add', '-A');
  git(main, '-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-qm', 'init');

  void it('gives a new worktree its own project, ports, database URL, and cookie', () => {
    const worktree = addWorktree('wt-a');
    const result = run(worktree);
    assert.equal(result.status, 0, result.stderr);

    const root = env(worktree, '.env');
    const ports = [root['POSTGRES_PORT'], root['BACKEND_PORT'], root['WEB_PORT']].map(Number);
    assert.equal(root['COMPOSE_PROJECT_NAME'], 'marketplace-wt-a');
    assert.deepEqual(ports, [ports[0], (ports[0] ?? 0) + 1, (ports[0] ?? 0) + 2]);
    assert.ok(ports.every((port) => port >= 20_000 && port <= 32_767));
    assert.match(
      env(worktree, 'apps/backend/.env')['DATABASE_URL'] ?? '',
      new RegExp(`:${ports[0]}/`)
    );
    assert.equal(
      env(worktree, 'apps/web/.env.local')['SESSION_COOKIE_NAME'],
      'marketplace_session_wt_a'
    );

    assert.match(run(worktree).stdout, /\.env\s+unchanged/);
  });

  void it("replaces values copied from another worktree's files", () => {
    const source = path.join(sandbox, 'wt-a');
    const worktree = addWorktree('wt-b');
    for (const file of ['.env', 'apps/backend/.env', 'apps/web/.env.local']) {
      fs.copyFileSync(path.join(source, file), path.join(worktree, file));
    }

    const result = run(worktree);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /belongs to another worktree/);

    const [mine, theirs] = [env(worktree, '.env'), env(source, '.env')];
    assert.equal(mine['COMPOSE_PROJECT_NAME'], 'marketplace-wt-b');
    for (const key of ['POSTGRES_PORT', 'BACKEND_PORT', 'WEB_PORT']) {
      assert.notEqual(mine[key], theirs[key]);
    }
    assert.equal(
      env(worktree, 'apps/web/.env.local')['SESSION_COOKIE_NAME'],
      'marketplace_session_wt_b'
    );
  });

  void it('keeps look-alike worktree names on distinct cookies', () => {
    const [dashed, underscored] = [addWorktree('feat-x'), addWorktree('feat_x')];
    assert.equal(run(dashed).status, 0);
    assert.equal(run(underscored).status, 0);
    assert.notEqual(
      env(dashed, 'apps/web/.env.local')['SESSION_COOKIE_NAME'],
      env(underscored, 'apps/web/.env.local')['SESSION_COOKIE_NAME']
    );
  });

  void it('refuses to write through a symlinked .env', () => {
    const worktree = addWorktree('wt-link');
    const target = path.join(sandbox, 'victim-profile');
    fs.symlinkSync(target, path.join(worktree, '.env'));

    const result = run(worktree);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /symlink/);
    assert.equal(fs.existsSync(target), false);
  });
});
