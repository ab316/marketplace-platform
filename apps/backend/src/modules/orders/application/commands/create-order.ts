import type { Clock, IdGenerator } from '@acme/core-contracts';
import { Money } from '@acme/core-domain';

import type { ListingSnapshot } from '../../domain/listing-snapshot.ts';
import { Order } from '../../domain/order.ts';
import { type OrderingBuyer, assertMayPlaceOrder } from '../../domain/ordering-policy.ts';
import { type OrderView, toOrderView } from '../order-view.ts';
import type { ListingReservations, OrderRepository } from '../ports.ts';

export interface CreateOrderCommand {
  readonly buyer: OrderingBuyer;
  readonly listingId: string;
}

/**
 * Places an order for exactly one unit of a listing.
 *
 * Eligibility (spec D3, P1-021) is checked before anything is reserved, so a refused attempt
 * changes nothing and holds no stock: staff are refused outright, and a member of the selling
 * organization is refused after one read of who sells the listing. `Order.place` enforces the same
 * rule again as the aggregate's own invariant.
 *
 * The unit is reserved before the order exists, so two buyers racing for the last unit cannot both
 * succeed. UC-001 runs without database transactions, so if placing or writing the order fails
 * after the unit is held, the reservation is released again rather than leaking stock.
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
    // Staff are refused before any IO; the seller rule needs to know who sells the listing.
    assertMayPlaceOrder(command.buyer, null);
    if (command.buyer.organizationId !== null) {
      const sellerOrganizationId = await this.#reservations.sellerOrganizationOf(command.listingId);
      if (sellerOrganizationId !== null) {
        assertMayPlaceOrder(command.buyer, sellerOrganizationId);
      }
    }

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

    let order: Order;
    try {
      order = Order.place({
        id: this.#ids.next(),
        buyer: command.buyer,
        listingSnapshot,
        now,
        expiresAt: new Date(now.getTime() + this.#reservationTtlMs),
        timelineEntryId: this.#ids.next(),
      });

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
