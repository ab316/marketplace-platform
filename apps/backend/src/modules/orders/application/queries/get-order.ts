import type { Clock } from '@acme/core-contracts';

import { OrderAccessDeniedError, OrderNotFoundError } from '../../domain/errors.ts';
import type { OrderNaming } from '../order-naming.ts';
import { type NamedOrderView, toOrderView } from '../order-view.ts';
import type { OrderRepository } from '../ports.ts';

export interface GetOrderQuery {
  readonly orderId: string;
  readonly viewerUserId: string;
  /** Set when the viewer acts for a seller organization. */
  readonly viewerOrganizationId?: string | undefined;
  /** Marketplace staff inspect any order, in any organization (UC-003 A2). */
  readonly viewerIsPlatformAdmin?: boolean | undefined;
}

/**
 * An order is visible to its buyer, to the selling organization, and to marketplace staff.
 *
 * Staff access is the operator order-inspection capability the roadmap calls for: read-only, and
 * granted by platform role rather than by membership.
 */
export class GetOrder {
  readonly #orders: OrderRepository;
  readonly #naming: OrderNaming;
  readonly #clock: Clock;

  constructor(orders: OrderRepository, naming: OrderNaming, clock: Clock) {
    this.#orders = orders;
    this.#naming = naming;
    this.#clock = clock;
  }

  async execute(query: GetOrderQuery): Promise<NamedOrderView> {
    const order = await this.#orders.findById(query.orderId);
    if (order === null) {
      throw new OrderNotFoundError(query.orderId);
    }

    const isBuyer = order.buyerUserId === query.viewerUserId;
    const isSeller =
      query.viewerOrganizationId !== undefined &&
      query.viewerOrganizationId === order.sellerOrganizationId;

    if (!isBuyer && !isSeller && query.viewerIsPlatformAdmin !== true) {
      throw new OrderAccessDeniedError(query.orderId);
    }

    return this.#naming.name(toOrderView(order, this.#clock.now()));
  }
}
