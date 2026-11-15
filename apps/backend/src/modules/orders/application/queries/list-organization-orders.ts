import type { Clock } from '@acme/core-contracts';

import type { OrderNaming } from '../order-naming.ts';
import { type PagedOrders, toOrderView } from '../order-view.ts';
import type { OrderRepository } from '../ports.ts';

export interface ListOrganizationOrdersQuery {
  /** The caller's own organization; the route derives it from membership, never from input. */
  readonly sellerOrganizationId: string;
  readonly limit: number;
  readonly offset: number;
}

/**
 * The orders a seller organization received (UC-015 R1, P1-023): every status, newest first.
 * Read-only, for any member role; the route checks `orders:read`, and the organization comes from
 * the caller's membership so one organization can never list another's orders.
 */
export class ListOrganizationOrders {
  readonly #orders: OrderRepository;
  readonly #naming: OrderNaming;
  readonly #clock: Clock;

  constructor(orders: OrderRepository, naming: OrderNaming, clock: Clock) {
    this.#orders = orders;
    this.#naming = naming;
    this.#clock = clock;
  }

  async execute(query: ListOrganizationOrdersQuery): Promise<PagedOrders> {
    const page = await this.#orders.findBySellerOrganization({
      sellerOrganizationId: query.sellerOrganizationId,
      limit: query.limit,
      offset: query.offset,
    });
    const now = this.#clock.now();

    const items = await this.#naming.nameAll(page.items.map((order) => toOrderView(order, now)));

    return { items, total: page.total, limit: query.limit, offset: query.offset };
  }
}
