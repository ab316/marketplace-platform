import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import type { ListingsTable } from '../../modules/listings/infrastructure/listings-table.ts';
import type {
  OrderTimelineEntriesTable,
  OrdersTable,
} from '../../modules/orders/infrastructure/orders-tables.ts';

export type Database = {
  listings: ListingsTable;
  orders: OrdersTable;
  order_timeline_entries: OrderTimelineEntriesTable;
};

export function createDb(databaseUrl: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: databaseUrl }),
    }),
  });
}
