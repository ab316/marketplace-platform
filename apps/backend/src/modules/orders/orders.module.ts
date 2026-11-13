import type { Clock, IdGenerator } from '@acme/core-contracts';
import type { Kysely } from 'kysely';

import type { Database } from '../../shared/infrastructure/database/schema.ts';
import { CancelOrder } from './application/commands/cancel-order.ts';
import { CreateOrder } from './application/commands/create-order.ts';
import { ExpireOverdueOrders } from './application/commands/expire-overdue-orders.ts';
import {
  HoldOrderForPayment,
  MarkOrderPaid,
  RecordPaymentFailed,
  RecordPaymentReturned,
} from './application/commands/payment-outcomes.ts';
import type { ListingReservations, OrderRepository, OrderSellers } from './application/ports.ts';
import { GetOrder } from './application/queries/get-order.ts';
import { ListBuyerOrders } from './application/queries/list-buyer-orders.ts';
import { InMemoryOrderRepository } from './infrastructure/persistence/in-memory-order-repository.ts';
import { PgOrderRepository } from './infrastructure/persistence/pg-order-repository.ts';
import type { OrdersModuleApi } from './orders.api.ts';

export interface OrdersModuleDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** Supplied by the application composition root; backed by the listings module. */
  readonly reservations: ListingReservations;
  /** Supplied by the composition root; backed by the identity module (P1-020). */
  readonly sellers: OrderSellers;
  /** How long an unpaid order holds its unit (UC-001: 24 hours). */
  readonly reservationTtlMs: number;
  /** Omitted in `memory` persistence mode. */
  readonly db?: Kysely<Database> | undefined;
}

/** Composition root for the orders module (ADR-007): the only place its infrastructure is built. */
export const createOrdersModule = (deps: OrdersModuleDependencies): OrdersModuleApi => {
  const orders: OrderRepository =
    deps.db === undefined ? new InMemoryOrderRepository() : new PgOrderRepository(deps.db);

  return {
    createOrder: new CreateOrder(
      orders,
      deps.reservations,
      deps.sellers,
      deps.clock,
      deps.ids,
      deps.reservationTtlMs
    ),
    cancelOrder: new CancelOrder(orders, deps.reservations, deps.sellers, deps.clock, deps.ids),
    expireOverdueOrders: new ExpireOverdueOrders(orders, deps.reservations, deps.clock, deps.ids),
    holdOrderForPayment: new HoldOrderForPayment(orders, deps.clock),
    markOrderPaid: new MarkOrderPaid(orders, deps.reservations, deps.clock, deps.ids),
    recordPaymentFailed: new RecordPaymentFailed(orders, deps.clock, deps.ids),
    recordPaymentReturned: new RecordPaymentReturned(orders, deps.clock, deps.ids),
    getOrder: new GetOrder(orders, deps.sellers, deps.clock),
    listBuyerOrders: new ListBuyerOrders(orders, deps.sellers, deps.clock),
  };
};
