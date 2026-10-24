import type { FastifyBaseLogger } from 'fastify';

import type { OrdersModuleApi } from '../modules/orders/orders.api.ts';

export interface ReservationExpiryJobOptions {
  readonly orders: OrdersModuleApi;
  readonly intervalMs: number;
  readonly batchSize: number;
  readonly logger: FastifyBaseLogger;
}

export interface ReservationExpiryJob {
  stop(): void;
}

/**
 * Releases units held by unpaid orders once their 24-hour window elapses (UC-001 A2).
 *
 * A plain interval is enough while expiry is the only scheduled work; move it to the job runner
 * when background processing grows. An interval of `0` disables the sweep.
 */
export const startReservationExpiryJob = (
  options: ReservationExpiryJobOptions
): ReservationExpiryJob => {
  if (options.intervalMs === 0) {
    return { stop: () => undefined };
  }

  let running = false;

  const sweep = async (): Promise<void> => {
    // Skip rather than queue: a slow sweep must not overlap itself.
    if (running) {
      return;
    }
    running = true;

    try {
      const result = await options.orders.expireOverdueOrders.execute({
        limit: options.batchSize,
      });

      if (result.expiredOrderIds.length > 0 || result.failedOrderIds.length > 0) {
        options.logger.info(
          { expired: result.expiredOrderIds.length, failed: result.failedOrderIds.length },
          'reservation expiry sweep completed'
        );
      }
    } catch (error) {
      options.logger.error({ err: error }, 'reservation expiry sweep failed');
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void sweep();
  }, options.intervalMs);

  // Never hold the process open just for the sweep.
  timer.unref();

  return { stop: () => clearInterval(timer) };
};
