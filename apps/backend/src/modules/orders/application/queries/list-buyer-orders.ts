import { type PagedOrders, toOrderView } from '../order-view.ts';
import type { OrderRepository } from '../ports.ts';

export interface ListBuyerOrdersQuery {
  readonly buyerUserId: string;
  readonly limit: number;
  readonly offset: number;
}

export class ListBuyerOrders {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(query: ListBuyerOrdersQuery): Promise<PagedOrders> {
    const page = await this.#orders.findByBuyer({
      buyerUserId: query.buyerUserId,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      items: page.items.map(toOrderView),
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
