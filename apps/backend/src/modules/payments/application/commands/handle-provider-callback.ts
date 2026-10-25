import type { Clock } from '@acme/core-contracts';

import {
  PaymentAttemptNotFoundError,
  PaymentConcurrencyError,
  ProviderCallbackRejectedError,
} from '../../domain/errors.ts';
import type {
  LedgerPostings,
  PayableOrders,
  PaymentAttemptRepository,
  ProviderCallback,
} from '../ports.ts';
import type { SettleCapturedPayment } from '../settle-captured-payment.ts';

export type CallbackResult = 'paid' | 'returned' | 'failed' | 'ignored';

/** Deliveries legitimately race (a duplicate callback, or the start still recording its reference). */
const MAX_ATTEMPTS = 5;

/**
 * UC-004 P4–P5 and A1, A3, A4, A5: the provider's answer. Runs the ordered, idempotent writes of
 * ADR-009 §3 — ledger first, then order, then attempt — so a redelivered callback converges on
 * the same end state and a crash between steps is repaired by the next delivery.
 */
export class HandleProviderCallback {
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

  /**
   * Every step is idempotent, so on a version conflict the whole handler simply runs again against
   * fresh state and converges: a duplicate delivered in parallel ends as `paid` on both paths.
   */
  async execute(callback: ProviderCallback): Promise<CallbackResult> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- each try must see the previous one's result
        return await this.#handle(callback);
      } catch (error) {
        if (!(error instanceof PaymentConcurrencyError) || attempt === MAX_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  async #handle(callback: ProviderCallback): Promise<CallbackResult> {
    const attempt = await this.#attempts.findById(callback.attemptId);
    if (attempt === null) {
      throw new PaymentAttemptNotFoundError(callback.attemptId);
    }
    if (attempt.state.provider !== callback.provider) {
      throw new ProviderCallbackRejectedError('Callback is from a different provider.', {
        attemptId: attempt.id,
      });
    }
    // The currency check is statically redundant while SEK is the only currency, and kept so a
    // second currency cannot slip through a callback unchecked.
    if (
      callback.amountMinor !== attempt.amount.amountMinor ||
      // oxlint-disable-next-line typescript/no-unnecessary-condition
      callback.currency !== attempt.amount.currency
    ) {
      throw new ProviderCallbackRejectedError('Callback amount does not match the attempt.', {
        attemptId: attempt.id,
        expectedMinor: attempt.amount.amountMinor,
        reportedMinor: callback.amountMinor,
      });
    }

    // Step 1: record the event. A replay is not refused — it is how a partial failure is retried —
    // but the status checks below make every effect a no-op once it is in place.
    await this.#attempts.recordProviderEvent({
      provider: callback.provider,
      providerEventId: callback.providerEventId,
      attemptId: attempt.id,
      type: callback.type,
      receivedAt: this.#clock.now(),
    });
    attempt.assignProviderReference(callback.providerReference);

    if (callback.type === 'failed') {
      if (!attempt.isPending) {
        return 'ignored';
      }
      attempt.fail(callback.failureReason ?? 'provider_declined', this.#clock.now());
      await this.#attempts.save(attempt);
      await this.#orders.recordFailed(
        attempt.orderId,
        attempt.id,
        attempt.state.failureReason ?? ''
      );
      return 'failed';
    }

    // A success after a final failure or reversal cannot be honoured; it is logged by the route.
    if (attempt.status === 'failed' || attempt.status === 'reversed') {
      return 'ignored';
    }
    if (attempt.status === 'succeeded') {
      return 'paid';
    }

    // Step 2: money first (ADR-009 §3). Idempotent per attempt.
    await this.#ledger.captureIntoEscrow({
      attemptId: attempt.id,
      orderId: attempt.orderId,
      provider: attempt.state.provider,
      amount: attempt.amount,
    });

    // Steps 3–4: order, then attempt.
    return this.#settle.execute(attempt);
  }
}
