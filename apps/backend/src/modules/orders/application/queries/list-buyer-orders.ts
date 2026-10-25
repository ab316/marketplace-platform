import type { Clock } from '@acme/core-contracts';

import { type PagedOrders, toOrderView } from '../order-view.ts';
import type { OrderRepository } from '../ports.ts';

export interface ListBuyerOrdersQuery {
  readonly buyerUserId: string;
  readonly limit: number;
  readonly offset: number;
}

export class ListBuyerOrders {
  readonly #orders: OrderRepository;
  readonly #clock: Clock;

  constructor(orders: OrderRepository, clock: Clock) {
    this.#orders = orders;
    this.#clock = clock;
  }

  async execute(query: ListBuyerOrdersQuery): Promise<PagedOrders> {
    const page = await this.#orders.findByBuyer({
      buyerUserId: query.buyerUserId,
      limit: query.limit,
      offset: query.offset,
    });
    const now = this.#clock.now();

    return {
      items: page.items.map((order) => toOrderView(order, now)),
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
