import path from 'node:path';

import { runner } from 'node-pg-migrate';
import { Client } from 'pg';

// Test infrastructure configuration, read once at module load.
// oxlint-disable-next-line node/no-process-env
const env = process.env;

export const TEST_DATABASE_URL =
  env['TEST_DATABASE_URL'] ??
  env['DATABASE_URL'] ??
  'postgres://postgres:postgres@localhost:5432/marketplace_test';

export async function isDatabaseAvailable(): Promise<boolean> {
  const client = new Client({
    connectionString: TEST_DATABASE_URL,
    connectionTimeoutMillis: 1500,
  });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function migrateToLatest(): Promise<void> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await runner({
      dbClient: client,
      dir: path.resolve(import.meta.dirname, '../../../migrations'),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: () => {},
    });
  } finally {
    await client.end();
  }
}

export async function truncateAll(): Promise<void> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query('TRUNCATE order_timeline_entries, orders, listings CASCADE');
  } finally {
    await client.end();
  }
}
