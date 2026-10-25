import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

import { createTestDatabase, runMigrations } from '../helpers/migrations.ts';

/** Same image as `docker-compose.yml`, so tests and local exploration see one Postgres version. */
const POSTGRES_IMAGE = 'postgres:18-alpine';
/** Migrated once per run; every test file clones it (`CREATE DATABASE … TEMPLATE`). */
const TEMPLATE_DATABASE = 'marketplace_template';

declare module 'vitest' {
  export interface ProvidedContext {
    /** `postgres` by default; `TEST_PERSISTENCE=memory` opts a run into in-process persistence. */
    readonly persistence: 'memory' | 'postgres';
    /** Admin connection to the per-run container, set only when `persistence` is `postgres`. */
    readonly adminDatabaseUrl: string;
    readonly templateDatabase: string;
  }
}

/**
 * Starts one Postgres container for the whole run and applies the real migrations to a template
 * database. Test files clone the template instead of re-running migrations, which keeps per-file
 * isolation cheap while still exercising the migrated schema end to end.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  let container: StartedPostgreSqlContainer;
  try {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  } catch (error) {
    throw new Error(
      'Could not start the Postgres test container. API integration tests run against real ' +
        'Postgres by default and need a running Docker daemon; set TEST_PERSISTENCE=memory for ' +
        'a dependency-free run.',
      { cause: error }
    );
  }

  const adminDatabaseUrl = container.getConnectionUri();
  const templateUrl = await createTestDatabase(adminDatabaseUrl, TEMPLATE_DATABASE);
  await runMigrations(templateUrl, 'up');

  project.provide('adminDatabaseUrl', adminDatabaseUrl);
  project.provide('templateDatabase', TEMPLATE_DATABASE);

  return async () => {
    await container.stop();
  };
}
