import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { MIGRATIONS_TABLE, createTestDatabase, runMigrations } from '../../helpers/migrations.ts';
import { uniqueDatabaseName } from '../../helpers/test-database.ts';

/**
 * Every migration must be reversible (ADR-006): a bad deploy is undone with `migrate:down`, and a
 * `down` that leaves objects behind makes the next `up` fail. This replaces the manual
 * up → down → up check with one that runs on every pull request.
 *
 * It needs an empty database rather than the migrated per-file clone, so it does not go through
 * `createTestApp()`. Postgres only: there is nothing to migrate in memory mode.
 */
describe.skipIf(inject('persistence') === 'memory')('Migrations', () => {
  let client: Client;
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = await createTestDatabase(inject('adminDatabaseUrl'), uniqueDatabaseName());
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  const publicTables = async (): Promise<string[]> => {
    const result = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );
    return result.rows.map((row) => row.table_name);
  };

  const appliedMigrations = async (): Promise<string[]> => {
    const result = await client.query<{ name: string }>(
      `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY run_on, id`
    );
    return result.rows.map((row) => row.name);
  };

  it('applies, fully reverts, and re-applies every migration on a fresh database', async () => {
    const appliedUp = await runMigrations(databaseUrl, 'up');
    expect(appliedUp.length).toBeGreaterThan(0);
    expect(await appliedMigrations()).toEqual(appliedUp);

    const migratedTables = await publicTables();
    expect(migratedTables).toEqual(
      expect.arrayContaining([
        'listings',
        'orders',
        'order_timeline_entries',
        'users',
        'user_credentials',
        'sessions',
        'organizations',
        'organization_memberships',
        'organization_audit_entries',
      ])
    );

    // Rolling back must undo migrations newest-first and leave only the bookkeeping table.
    const revertedDown = await runMigrations(databaseUrl, 'down');
    expect(revertedDown).toEqual(appliedUp.toReversed());
    expect(await appliedMigrations()).toEqual([]);
    expect(await publicTables()).toEqual([MIGRATIONS_TABLE]);

    // A clean rollback leaves nothing behind that would make re-applying fail.
    const reappliedUp = await runMigrations(databaseUrl, 'up');
    expect(reappliedUp).toEqual(appliedUp);
    expect(await publicTables()).toEqual(migratedTables);
  });

  it('reports nothing pending once every migration has been applied', async () => {
    expect(await runMigrations(databaseUrl, 'up')).toEqual([]);
  });
});
