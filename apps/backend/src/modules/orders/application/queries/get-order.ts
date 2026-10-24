import { OrderAccessDeniedError, OrderNotFoundError } from '../../domain/errors.ts';
import { type OrderView, toOrderView } from '../order-view.ts';
import type { OrderRepository } from '../ports.ts';

export interface GetOrderQuery {
  readonly orderId: string;
  readonly viewerUserId: string;
  /** Set when the viewer acts for a seller organization. */
  readonly viewerOrganizationId?: string | undefined;
}

/** An order is visible to its buyer and to the selling organization. */
export class GetOrder {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(query: GetOrderQuery): Promise<OrderView> {
    const order = await this.#orders.findById(query.orderId);
    if (order === null) {
      throw new OrderNotFoundError(query.orderId);
    }

    const isBuyer = order.buyerUserId === query.viewerUserId;
    const isSeller =
      query.viewerOrganizationId !== undefined &&
      query.viewerOrganizationId === order.sellerOrganizationId;

    if (!isBuyer && !isSeller) {
      throw new OrderAccessDeniedError(query.orderId);
    }

    return toOrderView(order);
  }
}
