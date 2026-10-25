import type { Money } from '@acme/core-domain';

import { PaymentStateError } from './errors.ts';

export type PaymentAttemptStatus = 'pending' | 'succeeded' | 'failed' | 'timed_out' | 'reversed';

export const PAYMENT_ATTEMPT_STATUSES: readonly PaymentAttemptStatus[] = [
  'pending',
  'succeeded',
  'failed',
  'timed_out',
  'reversed',
];

/** What the simulated provider is asked to do (PD-0004 §9, UC-004 scope decision 1). */
export type PaymentScenario = 'success' | 'failure' | 'timeout' | 'duplicate_success';

export const PAYMENT_SCENARIOS: readonly PaymentScenario[] = [
  'success',
  'failure',
  'timeout',
  'duplicate_success',
];

/** Set on the attempt when the provider never answered (UC-004 A2). */
export const PROVIDER_TIMEOUT_REASON = 'provider_timeout';

export interface PaymentAttemptState {
  readonly id: string;
  readonly orderId: string;
  readonly buyerUserId: string;
  readonly amount: Money;
  readonly status: PaymentAttemptStatus;
  readonly provider: string;
  readonly scenario: PaymentScenario | null;
  readonly providerReference: string | null;
  /** Frozen at success (PD-0004 §1); basis points. */
  readonly feeRateBps: number | null;
  readonly failureReason: string | null;
  readonly version: number;
  readonly startedAt: Date;
  /** The payment hold ends here if the provider has not answered (PD-0004 §2). */
  readonly timesOutAt: Date;
  readonly resolvedAt: Date | null;
}

export interface StartPaymentAttemptInput {
  readonly id: string;
  readonly orderId: string;
  readonly buyerUserId: string;
  readonly amount: Money;
  readonly provider: string;
  readonly scenario: PaymentScenario | null;
  readonly now: Date;
  readonly timesOutAt: Date;
}

/**
 * One try at collecting an order's total from the buyer (UC-004).
 *
 * Invariants:
 * - The amount is the order total, fixed at start.
 * - `pending → succeeded | failed | timed_out`; `timed_out → succeeded` (late success on a live
 *   order, A5); `pending | timed_out | succeeded → reversed` (money arrived for an order that
 *   could not keep it, A4). Every other transition is refused; resolving the same way twice is a
 *   no-op so a redelivered callback is harmless.
 * - The fee rate is recorded exactly once, at success, and never changed.
 */
export class PaymentAttempt {
  #state: PaymentAttemptState;

  private constructor(state: PaymentAttemptState) {
    this.#state = state;
  }

  static start(input: StartPaymentAttemptInput): PaymentAttempt {
    if (!input.amount.isPositive()) {
      throw new PaymentStateError('A payment attempt must collect a positive amount.', {
        amountMinor: input.amount.amountMinor,
      });
    }
    if (input.timesOutAt.getTime() <= input.now.getTime()) {
      throw new PaymentStateError('Payment timeout must be in the future.');
    }

    return new PaymentAttempt({
      id: input.id,
      orderId: input.orderId,
      buyerUserId: input.buyerUserId,
      amount: input.amount,
      status: 'pending',
      provider: input.provider,
      scenario: input.scenario,
      providerReference: null,
      feeRateBps: null,
      failureReason: null,
      version: 1,
      startedAt: input.now,
      timesOutAt: input.timesOutAt,
      resolvedAt: null,
    });
  }

  static restore(state: PaymentAttemptState): PaymentAttempt {
    return new PaymentAttempt(state);
  }

  get state(): PaymentAttemptState {
    return this.#state;
  }

  get id(): string {
    return this.#state.id;
  }

  get orderId(): string {
    return this.#state.orderId;
  }

  get status(): PaymentAttemptStatus {
    return this.#state.status;
  }

  get amount(): Money {
    return this.#state.amount;
  }

  get version(): number {
    return this.#state.version;
  }

  get isPending(): boolean {
    return this.#state.status === 'pending';
  }

  /** True once the provider's answer is overdue (UC-004 A2). */
  isOverdueAt(now: Date): boolean {
    return this.isPending && now.getTime() >= this.#state.timesOutAt.getTime();
  }

  /** The provider's own identifier; the first one recorded wins, later ones must agree. */
  assignProviderReference(reference: string): void {
    if (this.#state.providerReference === null) {
      this.#state = { ...this.#state, providerReference: reference };
      return;
    }
    if (this.#state.providerReference !== reference) {
      throw new PaymentStateError('Payment attempt already has a different provider reference.', {
        attemptId: this.#state.id,
      });
    }
  }

  /** Money is held in escrow and the order is paid (UC-004 P5, A5). Idempotent once succeeded. */
  succeed(feeRateBps: number, now: Date): void {
    if (this.#state.status === 'succeeded') {
      return;
    }
    this.#assertStatus(['pending', 'timed_out'], 'succeed');

    this.#state = {
      ...this.#state,
      status: 'succeeded',
      feeRateBps: this.#state.feeRateBps ?? feeRateBps,
      resolvedAt: now,
    };
  }

  /** The provider declined (UC-004 A1). */
  fail(reason: string, now: Date): void {
    this.#assertStatus(['pending'], 'fail');

    this.#state = { ...this.#state, status: 'failed', failureReason: reason, resolvedAt: now };
  }

  /** The provider never answered within the hold window (UC-004 A2). */
  timeOut(now: Date): void {
    this.#assertStatus(['pending'], 'time out');

    this.#state = {
      ...this.#state,
      status: 'timed_out',
      failureReason: PROVIDER_TIMEOUT_REASON,
      resolvedAt: now,
    };
  }

  /** Money arrived but the order could not keep it, so it was returned (UC-004 A4). Idempotent. */
  reverse(now: Date): void {
    if (this.#state.status === 'reversed') {
      return;
    }
    this.#assertStatus(['pending', 'timed_out', 'succeeded'], 'reverse');

    this.#state = { ...this.#state, status: 'reversed', resolvedAt: now };
  }

  #assertStatus(allowed: readonly PaymentAttemptStatus[], action: string): void {
    if (!allowed.includes(this.#state.status)) {
      throw new PaymentStateError(
        `Cannot ${action} a payment attempt that is ${this.#state.status}.`,
        {
          attemptId: this.#state.id,
          status: this.#state.status,
        }
      );
    }
  }
}
