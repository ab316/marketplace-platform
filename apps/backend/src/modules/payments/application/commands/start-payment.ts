import type { Clock, IdGenerator } from '@acme/core-contracts';

import {
  OrderNotPayableError,
  PaymentAccessDeniedError,
  PaymentConcurrencyError,
  ScenarioNotSupportedError,
} from '../../domain/errors.ts';
import { PaymentAttempt, type PaymentScenario } from '../../domain/payment-attempt.ts';
import { type PaymentAttemptView, toPaymentAttemptView } from '../payment-attempt-view.ts';
import type {
  PayableOrders,
  PaymentAttemptRepository,
  PaymentPolicy,
  PaymentProvider,
} from '../ports.ts';

export interface StartPaymentCommand {
  readonly orderId: string;
  readonly buyerUserId: string;
  readonly scenario?: PaymentScenario | undefined;
}

/**
 * UC-004 P1–P3: the buyer asks to pay; the system opens an attempt, holds the order against
 * expiry, and asks the provider to collect. The outcome arrives later as a callback.
 *
 * Write order: the attempt is inserted first because the database's one-pending-per-order index
 * is the concurrency guard (A6); the hold follows, and if the order turns out not to be payable
 * the attempt is closed as failed rather than left dangling.
 */
export class StartPayment {
  readonly #attempts: PaymentAttemptRepository;
  readonly #orders: PayableOrders;
  readonly #provider: PaymentProvider;
  readonly #policy: PaymentPolicy;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(
    attempts: PaymentAttemptRepository,
    orders: PayableOrders,
    provider: PaymentProvider,
    policy: PaymentPolicy,
    clock: Clock,
    ids: IdGenerator
  ) {
    this.#attempts = attempts;
    this.#orders = orders;
    this.#provider = provider;
    this.#policy = policy;
    this.#clock = clock;
    this.#ids = ids;
  }

  async execute(command: StartPaymentCommand): Promise<PaymentAttemptView> {
    if (command.scenario !== undefined && !this.#provider.supportsScenarios) {
      throw new ScenarioNotSupportedError();
    }

    const order = await this.#orders.load(command.orderId, command.buyerUserId);
    if (order.buyerUserId !== command.buyerUserId) {
      throw new PaymentAccessDeniedError(command.orderId);
    }

    const now = this.#clock.now();
    // An order past its expiry time is treated as expired even before the sweep runs (A7).
    if (order.status !== 'awaiting_payment' || now.getTime() >= order.expiresAt.getTime()) {
      throw new OrderNotPayableError(order.id, {
        status: order.status,
        expiresAt: order.expiresAt.toISOString(),
      });
    }

    const timesOutAt = new Date(now.getTime() + this.#policy.attemptTimeoutMs);
    const attempt = PaymentAttempt.start({
      id: this.#ids.next(),
      orderId: order.id,
      buyerUserId: order.buyerUserId,
      amount: order.total,
      provider: this.#provider.name,
      scenario: command.scenario ?? null,
      now,
      timesOutAt,
    });

    await this.#attempts.insert(attempt);

    try {
      await this.#orders.hold(order.id, attempt.id, timesOutAt);
    } catch (error) {
      attempt.fail('order_not_payable', this.#clock.now());
      await this.#attempts.save(attempt);
      throw error;
    }

    const started = await this.#provider.startPayment({
      attemptId: attempt.id,
      orderId: order.id,
      amount: order.total,
      scenario: attempt.state.scenario,
    });
    await this.#recordProviderReference(attempt.id, started.providerReference);

    return toPaymentAttemptView(attempt);
  }

  /**
   * The provider may have answered before we get here (the simulated one can), in which case the
   * callback already stored the reference and the attempt moved on; a version conflict is retried
   * against fresh state, and an attempt that already carries the reference needs nothing.
   */
  async #recordProviderReference(attemptId: string, reference: string): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      // oxlint-disable-next-line no-await-in-loop -- each try must see the previous one's result
      const current = await this.#attempts.findById(attemptId);
      if (current === null || current.state.providerReference === reference) {
        return;
      }
      current.assignProviderReference(reference);
      try {
        // oxlint-disable-next-line no-await-in-loop -- sequential by design
        await this.#attempts.save(current);
        return;
      } catch (error) {
        if (!(error instanceof PaymentConcurrencyError)) {
          throw error;
        }
      }
    }
  }
}
