import type { Money } from '@acme/core-domain';

import { OrderStateError } from './errors.ts';
import type { ListingSnapshot } from './listing-snapshot.ts';

export type OrderStatus = 'awaiting_payment' | 'cancelled';
export type CancellationReason = 'buyer_cancelled' | 'expired';
export type TimelineEntryType = 'order_created' | 'order_cancelled';

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

/**
 * A buyer's commitment to one unit of a listing.
 *
 * Invariants:
 * - An order always holds exactly one unit; quantity is not negotiable in UC-001.
 * - Only an order awaiting payment can be cancelled, and cancelling is terminal.
 * - Every status change appends a timeline entry, so the history is always complete.
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

  /** True once an unpaid order has outlived its reservation window. */
  isExpiredAt(now: Date): boolean {
    return (
      this.#state.status === 'awaiting_payment' && now.getTime() >= this.#state.expiresAt.getTime()
    );
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

    const entry: TimelineEntry = {
      id: input.timelineEntryId,
      sequence: this.#state.timeline.length + 1,
      type: 'order_cancelled',
      occurredAt: input.now,
      actorUserId: input.actorUserId,
      details: { reason: input.reason },
    };

    this.#state = {
      ...this.#state,
      status: 'cancelled',
      cancellationReason: input.reason,
      cancelledAt: input.now,
      timeline: [...this.#state.timeline, entry],
    };
  }
}
