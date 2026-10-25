import type { Money } from '@acme/core-domain';

import { OrderStateError } from './errors.ts';
import type { ListingSnapshot } from './listing-snapshot.ts';

export type OrderStatus = 'awaiting_payment' | 'paid_into_escrow' | 'cancelled';
export type CancellationReason = 'buyer_cancelled' | 'expired';
export type TimelineEntryType =
  | 'order_created'
  | 'order_cancelled'
  | 'payment_secured'
  | 'payment_failed'
  | 'payment_returned';

/** Why a payment that arrived could not be kept (UC-004 A4). */
export type PaymentReturnReason = 'order_cancelled' | 'order_already_paid';

/** Buyer-facing summary of where payment stands, derived from the order's own state. */
export type PaymentStatus = 'none' | 'in_progress' | 'paid' | 'failed' | 'returned';

/**
 * One visible thing that happened to the order. Entries are append-only and carry structured data;
 * the user-facing wording is rendered at the presentation boundary.
 */
export interface TimelineEntry {
  readonly id: string;
  readonly sequence: number;
  readonly type: TimelineEntryType;
  readonly occurredAt: Date;
  readonly actorUserId: string | null;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface OrderState {
  readonly id: string;
  readonly buyerUserId: string;
  readonly listingId: string;
  readonly sellerOrganizationId: string;
  readonly status: OrderStatus;
  readonly cancellationReason: CancellationReason | null;
  readonly total: Money;
  readonly listingSnapshot: ListingSnapshot;
  readonly timeline: readonly TimelineEntry[];
  readonly version: number;
  readonly createdAt: Date;
  /** When an unpaid order gives its reserved unit back (UC-001 A2). */
  readonly expiresAt: Date;
  readonly cancelledAt: Date | null;
  /** While in the future, a payment is in progress and the expiry sweep stays away (PD-0004 §2). */
  readonly paymentHoldUntil: Date | null;
  readonly paidAt: Date | null;
  readonly paidByAttemptId: string | null;
  /** The marketplace fee rate frozen at payment, in basis points (PD-0004 §1). */
  readonly feeRateBps: number | null;
}

export interface PlaceOrderInput {
  readonly id: string;
  readonly buyerUserId: string;
  readonly listingSnapshot: ListingSnapshot;
  readonly now: Date;
  readonly expiresAt: Date;
  readonly timelineEntryId: string;
}

export interface CancelOrderInput {
  readonly reason: CancellationReason;
  readonly actorUserId: string | null;
  readonly now: Date;
  readonly timelineEntryId: string;
}

export interface HoldForPaymentInput {
  readonly attemptId: string;
  readonly holdUntil: Date;
  readonly now: Date;
}

export interface MarkPaidInput {
  readonly attemptId: string;
  readonly feeRateBps: number;
  readonly now: Date;
  readonly timelineEntryId: string;
}

export type MarkPaidOutcome =
  | { readonly outcome: 'paid' }
  /** Already paid — by this attempt (a replay) or by another one (the caller must return the money). */
  | { readonly outcome: 'already_paid'; readonly byAttemptId: string }
  | { readonly outcome: 'not_payable'; readonly status: OrderStatus };

export interface RecordPaymentFailedInput {
  readonly attemptId: string;
  /** Provider-supplied reason, or `provider_timeout` when it never answered (UC-004 A2). */
  readonly reason: string;
  readonly now: Date;
  readonly timelineEntryId: string;
}

export interface RecordPaymentReturnedInput {
  readonly attemptId: string;
  readonly reason: PaymentReturnReason;
  readonly now: Date;
  readonly timelineEntryId: string;
}

/**
 * A buyer's commitment to one unit of a listing.
 *
 * Invariants:
 * - An order always holds exactly one unit; quantity is not negotiable in UC-001.
 * - Only an order awaiting payment can be cancelled, never while a payment is in progress, and
 *   cancelling is terminal: a cancelled order is never revived, whatever payment arrives later.
 * - Only an order awaiting payment can become paid, and exactly once.
 * - Every status change and every payment outcome appends a timeline entry, so the history is
 *   always complete.
 */
export class Order {
  #state: OrderState;

  private constructor(state: OrderState) {
    this.#state = state;
  }

  static place(input: PlaceOrderInput): Order {
    if (input.expiresAt.getTime() <= input.now.getTime()) {
      throw new OrderStateError('Order expiry must be in the future.', {
        expiresAt: input.expiresAt.toISOString(),
      });
    }

    const created: TimelineEntry = {
      id: input.timelineEntryId,
      sequence: 1,
      type: 'order_created',
      occurredAt: input.now,
      actorUserId: input.buyerUserId,
      details: { expiresAt: input.expiresAt.toISOString() },
    };

    return new Order({
      id: input.id,
      buyerUserId: input.buyerUserId,
      listingId: input.listingSnapshot.listingId,
      sellerOrganizationId: input.listingSnapshot.sellerOrganizationId,
      status: 'awaiting_payment',
      cancellationReason: null,
      total: input.listingSnapshot.price,
      listingSnapshot: input.listingSnapshot,
      timeline: [created],
      version: 1,
      createdAt: input.now,
      expiresAt: input.expiresAt,
      cancelledAt: null,
      paymentHoldUntil: null,
      paidAt: null,
      paidByAttemptId: null,
      feeRateBps: null,
    });
  }

  /** Rehydrates persisted state without re-running placement rules. */
  static restore(state: OrderState): Order {
    return new Order(state);
  }

  get state(): OrderState {
    return this.#state;
  }

  get id(): string {
    return this.#state.id;
  }

  get buyerUserId(): string {
    return this.#state.buyerUserId;
  }

  get listingId(): string {
    return this.#state.listingId;
  }

  get sellerOrganizationId(): string {
    return this.#state.sellerOrganizationId;
  }

  get status(): OrderStatus {
    return this.#state.status;
  }

  get version(): number {
    return this.#state.version;
  }

  /** True while a payment attempt is in progress and protects the order from expiry. */
  isHeldForPaymentAt(now: Date): boolean {
    return (
      this.#state.paymentHoldUntil !== null &&
      this.#state.paymentHoldUntil.getTime() > now.getTime()
    );
  }

  /** True once an unpaid order has outlived its reservation window and no payment is in progress. */
  isExpiredAt(now: Date): boolean {
    return (
      this.#state.status === 'awaiting_payment' &&
      now.getTime() >= this.#state.expiresAt.getTime() &&
      !this.isHeldForPaymentAt(now)
    );
  }

  /** Whether a buyer may start a payment right now (UC-004 P2, A6, A7). */
  isPayableAt(now: Date): boolean {
    return (
      this.#state.status === 'awaiting_payment' && now.getTime() < this.#state.expiresAt.getTime()
    );
  }

  /**
   * Where payment stands, as the buyer should understand it. Derived rather than stored so it can
   * never disagree with the order's status and timeline.
   */
  paymentStatusAt(now: Date): PaymentStatus {
    if (this.#state.status === 'paid_into_escrow') {
      return 'paid';
    }
    if (this.isHeldForPaymentAt(now)) {
      return 'in_progress';
    }
    const latest = this.#state.timeline.at(-1);
    if (latest?.type === 'payment_returned') {
      return 'returned';
    }
    if (latest?.type === 'payment_failed') {
      return 'failed';
    }
    return 'none';
  }

  /**
   * Ends an unpaid order. The caller releases the reserved unit afterwards; a cancelled order can
   * never be paid.
   */
  cancel(input: CancelOrderInput): void {
    if (this.#state.status !== 'awaiting_payment') {
      throw new OrderStateError('Only an order awaiting payment can be cancelled.', {
        orderId: this.#state.id,
        status: this.#state.status,
      });
    }
    if (this.isHeldForPaymentAt(input.now)) {
      throw new OrderStateError(
        'A payment is in progress for this order; wait for it to finish before cancelling.',
        { orderId: this.#state.id, paymentHoldUntil: this.#state.paymentHoldUntil?.toISOString() }
      );
    }

    this.#append(
      {
        type: 'order_cancelled',
        occurredAt: input.now,
        actorUserId: input.actorUserId,
        details: { reason: input.reason },
      },
      input.timelineEntryId
    );
    this.#state = {
      ...this.#state,
      status: 'cancelled',
      cancellationReason: input.reason,
      cancelledAt: input.now,
      paymentHoldUntil: null,
    };
  }

  /** Protects the order from expiry while a payment attempt runs (PD-0004 §2). */
  holdForPayment(input: HoldForPaymentInput): void {
    if (!this.isPayableAt(input.now)) {
      throw new OrderStateError('This order cannot be paid.', {
        orderId: this.#state.id,
        status: this.#state.status,
        expiresAt: this.#state.expiresAt.toISOString(),
      });
    }
    if (this.isHeldForPaymentAt(input.now)) {
      throw new OrderStateError('A payment is already in progress for this order.', {
        orderId: this.#state.id,
      });
    }

    this.#state = { ...this.#state, paymentHoldUntil: input.holdUntil };
  }

  /**
   * Moves the order into escrow (UC-004 P5). Idempotent for the same attempt; reports rather than
   * throws when the order cannot take the payment, so the caller can return the money.
   */
  markPaid(input: MarkPaidInput): MarkPaidOutcome {
    if (this.#state.status === 'paid_into_escrow') {
      return { outcome: 'already_paid', byAttemptId: this.#state.paidByAttemptId ?? '' };
    }
    if (this.#state.status !== 'awaiting_payment') {
      return { outcome: 'not_payable', status: this.#state.status };
    }

    this.#append(
      {
        type: 'payment_secured',
        occurredAt: input.now,
        actorUserId: this.#state.buyerUserId,
        details: {
          attemptId: input.attemptId,
          amountMinor: this.#state.total.amountMinor,
          feeRateBps: input.feeRateBps,
        },
      },
      input.timelineEntryId
    );
    this.#state = {
      ...this.#state,
      status: 'paid_into_escrow',
      paidAt: input.now,
      paidByAttemptId: input.attemptId,
      feeRateBps: input.feeRateBps,
      paymentHoldUntil: null,
    };
    return { outcome: 'paid' };
  }

  /**
   * A payment attempt ended without money moving (UC-004 A1, A2). Clears the hold so the order can
   * expire again, and records it whatever the order's status: a late failure report for an order
   * that has meanwhile been cancelled is still true history.
   */
  recordPaymentFailed(input: RecordPaymentFailedInput): void {
    this.#append(
      {
        type: 'payment_failed',
        occurredAt: input.now,
        actorUserId: null,
        details: { attemptId: input.attemptId, reason: input.reason },
      },
      input.timelineEntryId
    );
    this.#state = { ...this.#state, paymentHoldUntil: null };
  }

  /** Money arrived for an order that could not keep it and was sent back (UC-004 A4). */
  recordPaymentReturned(input: RecordPaymentReturnedInput): void {
    if (this.#state.status === 'awaiting_payment') {
      throw new OrderStateError('A payment is only returned for an order that cannot take it.', {
        orderId: this.#state.id,
        status: this.#state.status,
      });
    }

    this.#append(
      {
        type: 'payment_returned',
        occurredAt: input.now,
        actorUserId: null,
        details: {
          attemptId: input.attemptId,
          reason: input.reason,
          amountMinor: this.#state.total.amountMinor,
        },
      },
      input.timelineEntryId
    );
  }

  #append(entry: Omit<TimelineEntry, 'id' | 'sequence'>, id: string): void {
    this.#state = {
      ...this.#state,
      timeline: [
        ...this.#state.timeline,
        { ...entry, id, sequence: this.#state.timeline.length + 1 },
      ],
    };
  }
}
