import type { Clock } from '@acme/core-contracts';

import { type PagedOrders, toOrderView, withSellerName } from '../order-view.ts';
import type { OrderRepository, OrderSellers } from '../ports.ts';

export interface ListBuyerOrdersQuery {
  readonly buyerUserId: string;
  readonly limit: number;
  readonly offset: number;
}

export class ListBuyerOrders {
  readonly #orders: OrderRepository;
  readonly #sellers: OrderSellers;
  readonly #clock: Clock;

  constructor(orders: OrderRepository, sellers: OrderSellers, clock: Clock) {
    this.#orders = orders;
    this.#sellers = sellers;
    this.#clock = clock;
  }

  async execute(query: ListBuyerOrdersQuery): Promise<PagedOrders> {
    const page = await this.#orders.findByBuyer({
      buyerUserId: query.buyerUserId,
      limit: query.limit,
      offset: query.offset,
    });
    const now = this.#clock.now();

    // One read for the page, so naming the seller costs no round trip per row (P1-020).
    const names = await this.#sellers.namesOf([
      ...new Set(page.items.map((order) => order.sellerOrganizationId)),
    ]);

    return {
      items: page.items.map((order) => withSellerName(toOrderView(order, now), names)),
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
