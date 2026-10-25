import type { FastifyBaseLogger } from 'fastify';

import type { OrdersModuleApi } from '../modules/orders/orders.api.ts';
import { type PeriodicJob, startPeriodicJob } from './periodic-job.ts';

export interface ReservationExpiryJobOptions {
  readonly orders: OrdersModuleApi;
  readonly intervalMs: number;
  readonly batchSize: number;
  readonly logger: FastifyBaseLogger;
}

export type ReservationExpiryJob = PeriodicJob;

/** Releases units held by unpaid orders once their 24-hour window elapses (UC-001 A2). */
export const startReservationExpiryJob = (options: ReservationExpiryJobOptions): PeriodicJob =>
  startPeriodicJob({
    name: 'reservation expiry sweep',
    intervalMs: options.intervalMs,
    logger: options.logger,
    run: async () => {
      const result = await options.orders.expireOverdueOrders.execute({
        limit: options.batchSize,
      });
      return result.expiredOrderIds.length > 0 || result.failedOrderIds.length > 0
        ? { expired: result.expiredOrderIds.length, failed: result.failedOrderIds.length }
        : null;
    },
  });
