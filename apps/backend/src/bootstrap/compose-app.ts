import { randomUUID } from 'node:crypto';

import type { Clock, IdGenerator } from '@acme/core-contracts';
import type { Kysely } from 'kysely';

import { createListingsModule, type ListingsModule } from '../modules/listings/listings.module.ts';
import { createOrdersModule, type OrdersModule } from '../modules/orders/orders.module.ts';
import { createDb, type Database } from '../shared/infrastructure/database.ts';

export type App = {
  listings: ListingsModule;
  orders: OrdersModule;
  dispose(): Promise<void>;
};

export type ComposeOverrides = {
  db?: Kysely<Database>;
  clock?: Clock;
  idGenerator?: IdGenerator;
};

// Application composition root (ADR-007): creates shared resources and wires
// module factories in dependency order. No DI container.
export function composeApp(config: { databaseUrl: string }, overrides: ComposeOverrides = {}): App {
  const db = overrides.db ?? createDb(config.databaseUrl);
  const clock: Clock = overrides.clock ?? { now: () => new Date() };
  const idGenerator: IdGenerator = overrides.idGenerator ?? { next: () => randomUUID() };

  const listings = createListingsModule({ db, clock, idGenerator });
  const orders = createOrdersModule({ db, clock, idGenerator, listings });

  return {
    listings,
    orders,
    dispose: () => db.destroy(),
  };
}
