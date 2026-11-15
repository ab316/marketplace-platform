import type { Clock } from '@acme/core-contracts';

import type { OrderNaming } from '../order-naming.ts';
import { type PagedOrders, toOrderView } from '../order-view.ts';
import type { OrderRepository } from '../ports.ts';

export interface ListBuyerOrdersQuery {
  readonly buyerUserId: string;
  readonly limit: number;
  readonly offset: number;
}

export class ListBuyerOrders {
  readonly #orders: OrderRepository;
  readonly #naming: OrderNaming;
  readonly #clock: Clock;

  constructor(orders: OrderRepository, naming: OrderNaming, clock: Clock) {
    this.#orders = orders;
    this.#naming = naming;
    this.#clock = clock;
  }

  async execute(query: ListBuyerOrdersQuery): Promise<PagedOrders> {
    const page = await this.#orders.findByBuyer({
      buyerUserId: query.buyerUserId,
      limit: query.limit,
      offset: query.offset,
    });
    const now = this.#clock.now();

    // One read per party for the page, so naming costs no round trip per row (P1-020, P1-023).
    const items = await this.#naming.nameAll(page.items.map((order) => toOrderView(order, now)));

    return { items, total: page.total, limit: query.limit, offset: query.offset };
  }
}
