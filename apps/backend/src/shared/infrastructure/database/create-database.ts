import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';

import type { Database } from './schema.ts';

const PG_INT8_OID = 20;

/**
 * node-postgres returns `bigint` as a string to avoid silent precision loss. Money columns are SEK
 * minor units well inside the safe-integer range, so parse them to numbers and fail loudly if a
 * value ever exceeds it rather than rounding money silently.
 */
types.setTypeParser(PG_INT8_OID, (value: string) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`bigint ${value} exceeds the safe integer range`);
  }
  return parsed;
});

export interface DatabaseHandle {
  readonly db: Kysely<Database>;
  destroy(): Promise<void>;
}

export const createDatabase = (connectionString: string): DatabaseHandle => {
  const pool = new Pool({ connectionString });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

  return {
    db,
    destroy: async () => {
      await db.destroy();
    },
  };
};
