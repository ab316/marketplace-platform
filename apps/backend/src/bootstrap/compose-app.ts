import type { Clock } from '@acme/core-contracts';

import type { PasswordHasher } from '../modules/identity/application/ports.ts';
import type { IdentityModuleApi } from '../modules/identity/identity.api.ts';
import { createIdentityModule } from '../modules/identity/identity.module.ts';
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
import { createOrganizationDirectory } from './organization-directory.ts';

export interface App {
  readonly config: Config;
  readonly identity: IdentityModuleApi;
  readonly listings: ListingsModuleApi;
  readonly orders: OrdersModuleApi;
  dispose(): Promise<void>;
}

export interface ComposeAppOverrides {
  /** Tests inject a fixed clock to keep expiry behavior deterministic. */
  readonly clock?: Clock | undefined;
  /**
   * Tests substitute a cheap hasher: Argon2id is deliberately slow, and a suite that signs in
   * dozens of times would spend most of its run deriving keys. Production always uses Argon2id.
   */
  readonly passwords?: PasswordHasher | undefined;
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

  // Identity owns authentication and membership, so it is built first; nothing in it depends on
  // listings or orders.
  const identity = createIdentityModule({
    clock,
    ids: createIdGenerator('idn'),
    db: database?.db,
    sessionTtlMs: config.sessionTtlMs,
    passwords: overrides.passwords,
  });

  const listings = createListingsModule({
    clock,
    ids: createIdGenerator('lst'),
    db: database?.db,
    organizations: createOrganizationDirectory(identity),
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
    identity,
    listings,
    orders,
    dispose: async () => {
      await database?.destroy();
    },
  };
};
