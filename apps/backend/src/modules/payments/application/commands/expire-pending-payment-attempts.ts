import type { Clock } from '@acme/core-contracts';

import { PROVIDER_TIMEOUT_REASON } from '../../domain/payment-attempt.ts';
import type { LedgerPostings, PayableOrders, PaymentAttemptRepository } from '../ports.ts';
import type { SettleCapturedPayment } from '../settle-captured-payment.ts';

export interface ExpirePendingPaymentAttemptsCommand {
  readonly limit: number;
}

export interface ExpirePendingPaymentAttemptsResult {
  readonly timedOutAttemptIds: readonly string[];
  /** Attempts whose capture was already in the ledger and were settled instead of timed out. */
  readonly recoveredAttemptIds: readonly string[];
  readonly failedAttemptIds: readonly string[];
}

/**
 * UC-004 A2: closes attempts the provider never answered, so their orders can expire again.
 *
 * Also the recovery path for ADR-009 §3's failure window: an attempt still pending whose capture
 * is already posted means the handler died between steps; it is settled, not timed out, so money
 * in escrow never sits against an order that was quietly abandoned.
 */
export class ExpirePendingPaymentAttempts {
  readonly #attempts: PaymentAttemptRepository;
  readonly #orders: PayableOrders;
  readonly #ledger: LedgerPostings;
  readonly #settle: SettleCapturedPayment;
  readonly #clock: Clock;

  constructor(
    attempts: PaymentAttemptRepository,
    orders: PayableOrders,
    ledger: LedgerPostings,
    settle: SettleCapturedPayment,
    clock: Clock
  ) {
    this.#attempts = attempts;
    this.#orders = orders;
    this.#ledger = ledger;
    this.#settle = settle;
    this.#clock = clock;
  }

  async execute(
    command: ExpirePendingPaymentAttemptsCommand
  ): Promise<ExpirePendingPaymentAttemptsResult> {
    const now = this.#clock.now();
    const overdue = await this.#attempts.findOverdue(now, command.limit);

    const timedOutAttemptIds: string[] = [];
    const recoveredAttemptIds: string[] = [];
    const failedAttemptIds: string[] = [];

    for (const attempt of overdue) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- one attempt at a time, so one failure cannot abort the sweep
        if (await this.#ledger.hasCapture(attempt.id)) {
          // oxlint-disable-next-line no-await-in-loop -- sequential by design
          await this.#settle.execute(attempt);
          recoveredAttemptIds.push(attempt.id);
          continue;
        }

        attempt.timeOut(now);
        // oxlint-disable-next-line no-await-in-loop -- sequential by design
        await this.#attempts.save(attempt);
        // oxlint-disable-next-line no-await-in-loop -- clear the hold only after the attempt is closed
        await this.#orders.recordFailed(attempt.orderId, attempt.id, PROVIDER_TIMEOUT_REASON);
        timedOutAttemptIds.push(attempt.id);
      } catch {
        failedAttemptIds.push(attempt.id);
      }
    }

    return { timedOutAttemptIds, recoveredAttemptIds, failedAttemptIds };
  }
}
