import type { Clock, IdGenerator } from '@acme/core-contracts';

import { OrderAccessDeniedError, OrderNotFoundError } from '../../domain/errors.ts';
import type { OrderNaming } from '../order-naming.ts';
import { type NamedOrderView, toOrderView } from '../order-view.ts';
import type { ListingReservations, OrderRepository } from '../ports.ts';

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
  readonly #naming: OrderNaming;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(
    orders: OrderRepository,
    reservations: ListingReservations,
    naming: OrderNaming,
    clock: Clock,
    ids: IdGenerator
  ) {
    this.#orders = orders;
    this.#reservations = reservations;
    this.#naming = naming;
    this.#clock = clock;
    this.#ids = ids;
  }

  async execute(command: CancelOrderCommand): Promise<NamedOrderView> {
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

    return this.#naming.name(toOrderView(order, now));
  }
}
