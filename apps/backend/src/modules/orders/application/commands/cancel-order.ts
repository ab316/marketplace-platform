import type { Clock, IdGenerator } from '@acme/core-contracts';

import { OrderAccessDeniedError, OrderNotFoundError } from '../../domain/errors.ts';
import { type SellerNamedOrderView, toOrderView, withSellerName } from '../order-view.ts';
import type { ListingReservations, OrderRepository, OrderSellers } from '../ports.ts';

export interface CancelOrderCommand {
  readonly orderId: string;
  readonly actorUserId: string;
}

/**
 * Buyer cancellation of an unpaid order (UC-001 A1). The order is ended first and the reserved unit
 * released afterwards, so a failure can never leave a cancelled order still holding stock silently
 * marked as sold.
 */
export class CancelOrder {
  readonly #orders: OrderRepository;
  readonly #reservations: ListingReservations;
  readonly #sellers: OrderSellers;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(
    orders: OrderRepository,
    reservations: ListingReservations,
    sellers: OrderSellers,
    clock: Clock,
    ids: IdGenerator
  ) {
    this.#orders = orders;
    this.#reservations = reservations;
    this.#sellers = sellers;
    this.#clock = clock;
    this.#ids = ids;
  }

  async execute(command: CancelOrderCommand): Promise<SellerNamedOrderView> {
    const order = await this.#orders.findById(command.orderId);
    if (order === null) {
      throw new OrderNotFoundError(command.orderId);
    }
    if (order.buyerUserId !== command.actorUserId) {
      throw new OrderAccessDeniedError(command.orderId);
    }

    const now = this.#clock.now();
    order.cancel({
      reason: 'buyer_cancelled',
      actorUserId: command.actorUserId,
      now,
      timelineEntryId: this.#ids.next(),
    });

    await this.#orders.save(order);
    await this.#reservations.release(order.listingId);

    const names = await this.#sellers.namesOf([order.sellerOrganizationId]);
    return withSellerName(toOrderView(order, now), names);
  }
}
