import type { Clock, IdGenerator } from '@acme/core-contracts';
import { Money } from '@acme/core-domain';

import type { ListingSnapshot } from '../../domain/listing-snapshot.ts';
import { Order } from '../../domain/order.ts';
import { type OrderView, toOrderView } from '../order-view.ts';
import type { ListingReservations, OrderRepository } from '../ports.ts';

export interface CreateOrderCommand {
  readonly buyerUserId: string;
  readonly listingId: string;
}

/**
 * Places an order for exactly one unit of a listing.
 *
 * The unit is reserved before the order exists, so two buyers racing for the last unit cannot both
 * succeed. UC-001 runs without database transactions, so if the order write fails after the unit is
 * held, the reservation is released again rather than leaking stock.
 */
export class CreateOrder {
  readonly #orders: OrderRepository;
  readonly #reservations: ListingReservations;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;
  readonly #reservationTtlMs: number;

  constructor(
    orders: OrderRepository,
    reservations: ListingReservations,
    clock: Clock,
    ids: IdGenerator,
    reservationTtlMs: number
  ) {
    this.#orders = orders;
    this.#reservations = reservations;
    this.#clock = clock;
    this.#ids = ids;
    this.#reservationTtlMs = reservationTtlMs;
  }

  async execute(command: CreateOrderCommand): Promise<OrderView> {
    const reserved = await this.#reservations.reserve(command.listingId);
    const now = this.#clock.now();

    const listingSnapshot: ListingSnapshot = {
      listingId: reserved.listingId,
      sellerOrganizationId: reserved.sellerOrganizationId,
      title: reserved.title,
      description: reserved.description,
      specifications: reserved.specifications,
      condition: reserved.condition,
      price: Money.fromMinor(reserved.priceMinor, reserved.currency),
      fulfillmentExpectations: reserved.fulfillmentExpectations,
      capturedAt: now,
    };

    const order = Order.place({
      id: this.#ids.next(),
      buyerUserId: command.buyerUserId,
      listingSnapshot,
      now,
      expiresAt: new Date(now.getTime() + this.#reservationTtlMs),
      timelineEntryId: this.#ids.next(),
    });

    try {
      await this.#orders.insert(order);
    } catch (error) {
      await this.#releaseQuietly(command.listingId);
      throw error;
    }

    return toOrderView(order, now);
  }

  /** A failed compensation must not mask the error that caused it. */
  async #releaseQuietly(listingId: string): Promise<void> {
    try {
      await this.#reservations.release(listingId);
    } catch {
      // Intentionally ignored: the original failure is rethrown by the caller.
    }
  }
}
