import type { Clock, IdGenerator } from '@acme/core-contracts';
import type { Kysely } from 'kysely';

import type { Database } from '../../shared/infrastructure/database.ts';
import { createOrdersService, type OrdersService } from './application/orders-service.ts';
import type { ListingsGateway } from './application/ports.ts';
import { createKyselyOrderRepository } from './infrastructure/kysely-order-repository.ts';

export type OrdersModuleDeps = {
  db: Kysely<Database>;
  clock: Clock;
  idGenerator: IdGenerator;
  // Public application API of the listings module (never its infrastructure).
  listings: ListingsGateway;
};

// Composition root for the orders module (ADR-007).
export function createOrdersModule(deps: OrdersModuleDeps): OrdersService {
  return createOrdersService({
    orderRepository: createKyselyOrderRepository(deps.db),
    listings: deps.listings,
    clock: deps.clock,
    idGenerator: deps.idGenerator,
  });
}

export type OrdersModule = OrdersService;
