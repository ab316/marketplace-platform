import type { Clock, IdGenerator } from '@acme/core-contracts';

import { OrderConcurrencyError, OrderNotFoundError } from '../../domain/errors.ts';
import type { MarkPaidOutcome, Order, PaymentReturnReason } from '../../domain/order.ts';
import { type OrderView, toOrderView } from '../order-view.ts';
import type { ListingReservations, OrderRepository } from '../ports.ts';

/**
 * How the payments module moves an order (ADR-009 §3). These commands are called by the payments
 * module through the `PayableOrders` adapter in `src/bootstrap/`; no HTTP route exposes them.
 *
 * Each is idempotent for the same attempt, because the payment callback that drives them may be
 * delivered more than once and may be retried after a partial failure.
 */

export interface HoldOrderForPaymentCommand {
  readonly orderId: string;
  readonly attemptId: string;
  readonly holdUntil: Date;
}

/** Protects the order from expiry while a payment attempt runs (PD-0004 §2). */
export class HoldOrderForPayment {
  readonly #orders: OrderRepository;
  readonly #clock: Clock;

  constructor(orders: OrderRepository, clock: Clock) {
    this.#orders = orders;
    this.#clock = clock;
  }

  execute(command: HoldOrderForPaymentCommand): Promise<OrderView> {
    return retryingOnConflict(async () => {
      const order = await loadOrder(this.#orders, command.orderId);
      const now = this.#clock.now();

      order.holdForPayment({ attemptId: command.attemptId, holdUntil: command.holdUntil, now });
      await this.#orders.save(order);

      return toOrderView(order, now);
    });
  }
}

export interface MarkOrderPaidCommand {
  readonly orderId: string;
  readonly attemptId: string;
  readonly feeRateBps: number;
}

export interface MarkOrderPaidResult {
  readonly outcome: MarkPaidOutcome;
  readonly order: OrderView;
}

/**
 * Moves the order into escrow and closes the sale of its unit (UC-004 P5). Reports, rather than
 * throws, when the order cannot take the payment so the caller can return the money (A4).
 *
 * The order write and the stock conversion are two aggregates in two transactions (ADR-009 §3,
 * known gap); the order is written first so a crash leaves a paid order with a reserved unit —
 * recoverable by replaying this command — rather than a sold unit on an unpaid order.
 */
export class MarkOrderPaid {
  readonly #orders: OrderRepository;
  readonly #reservations: ListingReservations;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(
    orders: OrderRepository,
    reservations: ListingReservations,
    clock: Clock,
    ids: IdGenerator
  ) {
    this.#orders = orders;
    this.#reservations = reservations;
    this.#clock = clock;
    this.#ids = ids;
  }

  execute(command: MarkOrderPaidCommand): Promise<MarkOrderPaidResult> {
    return retryingOnConflict(async () => {
      const order = await loadOrder(this.#orders, command.orderId);
      const now = this.#clock.now();

      const outcome = order.markPaid({
        attemptId: command.attemptId,
        feeRateBps: command.feeRateBps,
        now,
        timelineEntryId: this.#ids.next(),
      });

      if (outcome.outcome === 'paid') {
        await this.#orders.save(order);
        await this.#reservations.markSold(order.listingId);
      }

      return { outcome, order: toOrderView(order, now) };
    });
  }
}

export interface RecordPaymentFailedCommand {
  readonly orderId: string;
  readonly attemptId: string;
  readonly reason: string;
}

/** A payment attempt ended without money moving; the order is free to expire again (UC-004 A1, A2). */
export class RecordPaymentFailed {
  readonly #orders: OrderRepository;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(orders: OrderRepository, clock: Clock, ids: IdGenerator) {
    this.#orders = orders;
    this.#clock = clock;
    this.#ids = ids;
  }

  execute(command: RecordPaymentFailedCommand): Promise<OrderView> {
    return retryingOnConflict(async () => {
      const order = await loadOrder(this.#orders, command.orderId);
      const now = this.#clock.now();

      if (!alreadyRecorded(order, 'payment_failed', command.attemptId)) {
        order.recordPaymentFailed({
          attemptId: command.attemptId,
          reason: command.reason,
          now,
          timelineEntryId: this.#ids.next(),
        });
        await this.#orders.save(order);
      }

      return toOrderView(order, now);
    });
  }
}

export interface RecordPaymentReturnedCommand {
  readonly orderId: string;
  readonly attemptId: string;
  readonly reason: PaymentReturnReason;
}

/** Money arrived for an order that could not keep it and was returned (UC-004 A4). */
export class RecordPaymentReturned {
  readonly #orders: OrderRepository;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(orders: OrderRepository, clock: Clock, ids: IdGenerator) {
    this.#orders = orders;
    this.#clock = clock;
    this.#ids = ids;
  }

  execute(command: RecordPaymentReturnedCommand): Promise<OrderView> {
    return retryingOnConflict(async () => {
      const order = await loadOrder(this.#orders, command.orderId);
      const now = this.#clock.now();

      if (!alreadyRecorded(order, 'payment_returned', command.attemptId)) {
        order.recordPaymentReturned({
          attemptId: command.attemptId,
          reason: command.reason,
          now,
          timelineEntryId: this.#ids.next(),
        });
        await this.#orders.save(order);
      }

      return toOrderView(order, now);
    });
  }
}

const MAX_ATTEMPTS = 5;

/**
 * Payment outcomes arrive from callbacks that may be delivered twice, in parallel, and may race
 * the buyer's own actions. Each command re-reads and re-applies on a version conflict, which is
 * safe because every one of them is idempotent for the same attempt.
 */
const retryingOnConflict = async <T>(operation: () => Promise<T>): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- each try must see the previous one's result
      return await operation();
    } catch (error) {
      if (!(error instanceof OrderConcurrencyError) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
    }
  }
};

const loadOrder = async (orders: OrderRepository, orderId: string): Promise<Order> => {
  const order = await orders.findById(orderId);
  if (order === null) {
    throw new OrderNotFoundError(orderId);
  }
  return order;
};

/** A replayed callback must not append the same outcome twice. */
const alreadyRecorded = (
  order: Order,
  type: 'payment_failed' | 'payment_returned',
  attemptId: string
): boolean =>
  order.state.timeline.some(
    (entry) => entry.type === type && entry.details['attemptId'] === attemptId
  );
