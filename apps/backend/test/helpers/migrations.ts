import { fileURLToPath } from 'node:url';

import { runner } from 'node-pg-migrate';
import { Client } from 'pg';

/** node-pg-migrate's bookkeeping table, matching the `migrate:*` scripts' default. */
export const MIGRATIONS_TABLE = 'pgmigrations';

const migrationsDir = fileURLToPath(new URL('../../migrations', import.meta.url));

/** Rewrites the database segment of a Postgres connection URI. */
export const withDatabase = (connectionUri: string, database: string): string => {
  const url = new URL(connectionUri);
  url.pathname = `/${database}`;
  return url.toString();
};

/**
 * Creates a database on the test container and returns its connection URI. Pass `template` to
 * clone an existing database instead of starting from an empty one.
 */
export const createTestDatabase = async (
  adminDatabaseUrl: string,
  name: string,
  template?: string
): Promise<string> => {
  const admin = new Client({ connectionString: adminDatabaseUrl });
  await admin.connect();
  try {
    await admin.query(
      template === undefined
        ? `CREATE DATABASE ${name}`
        : `CREATE DATABASE ${name} TEMPLATE ${template}`
    );
  } finally {
    await admin.end();
  }
  return withDatabase(adminDatabaseUrl, name);
};

/**
 * Applies the repository's real migration files in the given direction, exactly as the
 * `migrate:up` / `migrate:down` scripts do. The runner opens and closes its own connection, so
 * the database has no lingering sessions afterwards (required to use it as a template).
 *
 * `count` defaults to every pending migration; the CLI's `down` applies only one.
 */
export const runMigrations = async (
  databaseUrl: string,
  direction: 'up' | 'down',
  count: number = Number.POSITIVE_INFINITY
): Promise<readonly string[]> => {
  const applied = await runner({
    databaseUrl,
    dir: migrationsDir,
    direction,
    count,
    migrationsTable: MIGRATIONS_TABLE,
    log: () => {},
  });
  return applied.map((migration) => migration.name);
};
