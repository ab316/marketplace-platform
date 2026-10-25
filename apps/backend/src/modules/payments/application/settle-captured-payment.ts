import type { Clock } from '@acme/core-contracts';

import type { PaymentAttempt } from '../domain/payment-attempt.ts';
import type {
  LedgerPostings,
  PayableOrders,
  PaymentAttemptRepository,
  PaymentPolicy,
} from './ports.ts';

export type SettlementResult = 'paid' | 'returned';

/**
 * Steps 3–4 of the payment success path (ADR-009 §3), shared by the callback handler and the
 * timeout sweep's recovery: the capture is already in the ledger, so either the order takes the
 * money or the money goes back. Every step is idempotent, so re-running after a crash converges.
 */
export class SettleCapturedPayment {
  readonly #attempts: PaymentAttemptRepository;
  readonly #orders: PayableOrders;
  readonly #ledger: LedgerPostings;
  readonly #policy: PaymentPolicy;
  readonly #clock: Clock;

  constructor(
    attempts: PaymentAttemptRepository,
    orders: PayableOrders,
    ledger: LedgerPostings,
    policy: PaymentPolicy,
    clock: Clock
  ) {
    this.#attempts = attempts;
    this.#orders = orders;
    this.#ledger = ledger;
    this.#policy = policy;
    this.#clock = clock;
  }

  async execute(attempt: PaymentAttempt): Promise<SettlementResult> {
    const outcome = await this.#orders.markPaid(
      attempt.orderId,
      attempt.id,
      this.#policy.platformFeeBps
    );

    const keepsMoney =
      outcome.outcome === 'paid' ||
      (outcome.outcome === 'already_paid' && outcome.byAttemptId === attempt.id);

    if (keepsMoney) {
      attempt.succeed(this.#policy.platformFeeBps, this.#clock.now());
      await this.#attempts.save(attempt);
      return 'paid';
    }

    // The order is cancelled, or was paid by another attempt (UC-004 A4): return the money and
    // leave the order exactly as it was.
    const posting = {
      attemptId: attempt.id,
      orderId: attempt.orderId,
      provider: attempt.state.provider,
      amount: attempt.amount,
    };
    await this.#ledger.returnToBuyer(posting);
    await this.#orders.recordReturned(
      attempt.orderId,
      attempt.id,
      outcome.outcome === 'already_paid' ? 'order_already_paid' : 'order_cancelled'
    );
    attempt.reverse(this.#clock.now());
    await this.#attempts.save(attempt);
    return 'returned';
  }
}
