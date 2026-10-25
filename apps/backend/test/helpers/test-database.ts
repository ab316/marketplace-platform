import { randomUUID } from 'node:crypto';

import { sql } from 'kysely';
import { inject } from 'vitest';

import {
  type DatabaseHandle,
  createDatabase,
} from '../../src/shared/infrastructure/database/create-database.ts';
import { MIGRATIONS_TABLE, createTestDatabase } from './migrations.ts';

export interface TestDatabase {
  readonly url: string;
  readonly handle: DatabaseHandle;
  /** Empties every application table so the next test starts from the migrated, empty schema. */
  reset(): Promise<void>;
  destroy(): Promise<void>;
}

let current: Promise<TestDatabase> | undefined;

/** A unique, identifier-safe database name for this file. */
export const uniqueDatabaseName = (): string => `test_${randomUUID().replaceAll('-', '')}`;

const createFileDatabase = async (): Promise<TestDatabase> => {
  const url = await createTestDatabase(
    inject('adminDatabaseUrl'),
    uniqueDatabaseName(),
    inject('templateDatabase')
  );
  const handle = createDatabase(url);

  const tables = await sql<{ table_name: string }>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> ${MIGRATIONS_TABLE}
  `.execute(handle.db);
  const tableList = tables.rows.map((row) => `"${row.table_name}"`).join(', ');

  return {
    url,
    handle,
    reset: async () => {
      // Truncation (excluding the migrations table, which must keep the schema looking migrated)
      // rather than a wrapping transaction: tests must see the production commit
      // boundaries, and later destructive tests depend on real commits (TESTING_STRATEGY §7.2).
      await sql.raw(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`).execute(handle.db);
    },
    destroy: async () => {
      await handle.destroy();
      // The database itself is left behind: the container is discarded at the end of the run.
    },
  };
};

/**
 * One database per test file, cloned from the migrated template. Vitest runs files in separate
 * workers, so module state here is file-local; `disposeTestDatabase` runs from the integration
 * setup file's `afterAll`.
 */
export const getTestDatabase = (): Promise<TestDatabase> => {
  current ??= createFileDatabase();
  return current;
};

export const disposeTestDatabase = async (): Promise<void> => {
  const pending = current;
  current = undefined;
  if (pending !== undefined) {
    await (await pending).destroy();
  }
};
