import type { FastifyBaseLogger } from 'fastify';

import type { PaymentsModuleApi } from '../modules/payments/payments.api.ts';
import { type PeriodicJob, startPeriodicJob } from './periodic-job.ts';

export interface PaymentTimeoutJobOptions {
  readonly payments: PaymentsModuleApi;
  readonly intervalMs: number;
  readonly batchSize: number;
  readonly logger: FastifyBaseLogger;
}

/**
 * Closes payment attempts the provider never answered (UC-004 A2) and settles any whose capture
 * was posted but never applied to the order (ADR-009 §3 recovery).
 */
export const startPaymentTimeoutJob = (options: PaymentTimeoutJobOptions): PeriodicJob =>
  startPeriodicJob({
    name: 'payment timeout sweep',
    intervalMs: options.intervalMs,
    logger: options.logger,
    run: async () => {
      const result = await options.payments.expirePendingPaymentAttempts.execute({
        limit: options.batchSize,
      });
      const total =
        result.timedOutAttemptIds.length +
        result.recoveredAttemptIds.length +
        result.failedAttemptIds.length;
      return total > 0
        ? {
            timedOut: result.timedOutAttemptIds.length,
            recovered: result.recoveredAttemptIds.length,
            failed: result.failedAttemptIds.length,
          }
        : null;
    },
  });
