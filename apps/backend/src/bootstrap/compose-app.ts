import type { Clock } from '@acme/core-contracts';

import type { ListingsModuleApi } from '../modules/listings/listings.api.ts';
import { createListingsModule } from '../modules/listings/listings.module.ts';
import type { OrdersModuleApi } from '../modules/orders/orders.api.ts';
import { createOrdersModule } from '../modules/orders/orders.module.ts';
import {
  type DatabaseHandle,
  createDatabase,
} from '../shared/infrastructure/database/create-database.ts';
import type { Config } from './config.ts';
import { createIdGenerator } from './id-generator.ts';
import { createListingReservations } from './listing-reservations.ts';

export interface App {
  readonly config: Config;
  readonly listings: ListingsModuleApi;
  readonly orders: OrdersModuleApi;
  dispose(): Promise<void>;
}

export interface ComposeAppOverrides {
  /** Tests inject a fixed clock to keep expiry behavior deterministic. */
  readonly clock?: Clock | undefined;
}

/**
 * Application composition root (ADR-007): creates shared resources, builds each module in
 * dependency order, and owns shutdown. No DI container.
 */
export const composeApp = (config: Config, overrides: ComposeAppOverrides = {}): App => {
  const clock: Clock = overrides.clock ?? { now: () => new Date() };

  // Falling back to in-memory here would silently serve throwaway data, so a misconfigured
  // Postgres mode must fail to start instead.
  if (config.persistence === 'postgres' && config.databaseUrl === undefined) {
    throw new Error('PERSISTENCE is "postgres" but no databaseUrl was provided.');
  }

  const database: DatabaseHandle | null =
    config.databaseUrl === undefined || config.persistence !== 'postgres'
      ? null
      : createDatabase(config.databaseUrl);

  const listings = createListingsModule({
    clock,
    ids: createIdGenerator('lst'),
    db: database?.db,
  });

  // Orders depend on listings for stock, never the other way round.
  const orders = createOrdersModule({
    clock,
    ids: createIdGenerator('ord'),
    db: database?.db,
    reservations: createListingReservations(listings),
    reservationTtlMs: config.reservationTtlMs,
  });

  return {
    config,
    listings,
    orders,
    dispose: async () => {
      await database?.destroy();
    },
  };
};
