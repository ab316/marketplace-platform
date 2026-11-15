import fs from 'node:fs';
import path from 'node:path';

/**
 * The testable half of `pnpm env:init` (scripts/worktree-env.ts): name derivation, env-file
 * rewriting, and file access that refuses symlinks. Tests: scripts/worktree-env.test.ts.
 */

export const DEFAULT_PROJECT_NAME = 'marketplace';
export const DEFAULT_SESSION_COOKIE_NAME = 'marketplace_session';

/** Docker Compose's rule for project names. */
export const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
/** Mirrors the validation of `SESSION_COOKIE_NAME` in `apps/web/src/lib/env.ts`. */
export const SESSION_COOKIE_NAME_PATTERN = /^(?!__)[A-Za-z0-9_]{1,64}$/;

export const parsePort = (value: string | undefined): number | undefined => {
  if (value === undefined || !/^\d+$/.test(value.trim())) return undefined;
  const port = Number.parseInt(value, 10);
  return port >= 1 && port <= 65_535 ? port : undefined;
};

/** `marketplace-<worktree folder>`, reduced to what Compose accepts. */
export const toProjectName = (worktreeName: string): string => {
  const slug = worktreeName
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, '-')
    .replaceAll(/-{2,}/g, '-')
    .replaceAll(/^[-_]+|[-_]+$/g, '');
  return `${DEFAULT_PROJECT_NAME}-${slug === '' ? 'worktree' : slug}`;
};

/** `marketplace_session_<worktree>`; cookie names allow no dashes, so they become underscores. */
export const toSessionCookieName = (projectName: string): string => {
  const suffix = projectName
    .replace(new RegExp(`^${DEFAULT_PROJECT_NAME}-`), '')
    .replaceAll(/[^A-Za-z0-9_]/g, '_');
  // Leaves room for the numeric suffix `uniqueName` may add, within the 64-character limit.
  return `${DEFAULT_SESSION_COOKIE_NAME}_${suffix}`.slice(0, 60);
};

/** `wanted`, or `wanted<separator>2`, `…3`, … — the first one not taken. */
export const uniqueName = (
  wanted: string,
  taken: ReadonlySet<string>,
  separator: '-' | '_'
): string => {
  if (!taken.has(wanted)) return wanted;
  let suffix = 2;
  while (taken.has(`${wanted}${separator}${suffix}`)) suffix += 1;
  return `${wanted}${separator}${suffix}`;
};

/**
 * Sets each key in place (every occurrence, so a duplicate further down cannot win) and appends
 * the keys the file lacks. Comments, unrelated lines, `export` prefixes, and CRLF line endings
 * are preserved.
 */
export const upsertEnv = (content: string, updates: Readonly<Record<string, string>>): string => {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/).map((line) => {
    const match = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    const key = match?.[2];
    if (key === undefined || !(key in updates)) return line;
    seen.add(key);
    return `${match?.[1] ?? ''}${key}=${updates[key]}`;
  });

  const missing = Object.keys(updates).filter((key) => !seen.has(key));
  if (missing.length === 0) return lines.join(eol);

  while (lines.length > 0 && lines.at(-1) === '') lines.pop();
  const appended = missing.map((key) => `${key}=${updates[key]}`);
  return [...lines, ...(lines.length > 0 ? [''] : []), ...appended, ''].join(eol);
};

export class UnsafePathError extends Error {}

/**
 * Throws when any existing component of `relativePath` under `root` is a symlink. The files come
 * from whatever branch is checked out, and a branch can commit `.env` as a link to, say, a shell
 * startup file elsewhere on disk — which a write would then create or overwrite.
 */
const assertNoSymlinks = (root: string, relativePath: string): string => {
  let current = fs.realpathSync(root);
  for (const part of path.normalize(relativePath).split(path.sep)) {
    if (part === '..') throw new UnsafePathError(`${relativePath} leaves ${root}.`);
    current = path.join(current, part);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch {
      break; // Nothing exists from here on, so nothing can be a link.
    }
    if (stat.isSymbolicLink()) {
      throw new UnsafePathError(
        `${path.relative(root, current)} is a symlink; refusing to use it.`
      );
    }
  }
  return current;
};

/** The file's text, or `null` when it does not exist. Refuses symlinks. */
export const readInside = (root: string, relativePath: string): string | null => {
  const absolute = assertNoSymlinks(root, relativePath);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : null;
};

/**
 * Writes without ever following a link: symlinked components are refused up front, and
 * `O_NOFOLLOW` covers the last component at open time. New files are private to the user.
 */
export const writeInside = (root: string, relativePath: string, content: string): void => {
  const absolute = assertNoSymlinks(root, relativePath);
  const { O_WRONLY, O_CREAT, O_EXCL, O_TRUNC, O_NOFOLLOW } = fs.constants;
  const flags = fs.existsSync(absolute)
    ? O_WRONLY | O_TRUNC | O_NOFOLLOW
    : O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW;
  const fd = fs.openSync(absolute, flags, 0o600);
  try {
    fs.writeFileSync(fd, content);
  } finally {
    fs.closeSync(fd);
  }
};
