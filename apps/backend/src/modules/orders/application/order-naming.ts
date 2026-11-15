import { type NamedOrderView, type OrderView, withPartyNames } from './order-view.ts';
import type { OrderBuyers, OrderSellers } from './ports.ts';

/**
 * Names both parties on order views in one read per party, so a page of orders costs two lookups
 * rather than two per row. The seller's name is for the buyer (P1-020); the buyer's display name is
 * for the selling organization and staff (P1-023). Every order response carries both, because the
 * same read serves whichever party is looking.
 */
export class OrderNaming {
  readonly #sellers: OrderSellers;
  readonly #buyers: OrderBuyers;

  constructor(sellers: OrderSellers, buyers: OrderBuyers) {
    this.#sellers = sellers;
    this.#buyers = buyers;
  }

  async name(view: OrderView): Promise<NamedOrderView> {
    const [named] = await this.nameAll([view]);
    if (named === undefined) {
      throw new Error('Naming a single order view produced no result.');
    }
    return named;
  }

  async nameAll(views: readonly OrderView[]): Promise<readonly NamedOrderView[]> {
    if (views.length === 0) {
      return [];
    }
    const [sellerNames, buyerNames] = await Promise.all([
      this.#sellers.namesOf([...new Set(views.map((view) => view.sellerOrganizationId))]),
      this.#buyers.displayNamesOf([...new Set(views.map((view) => view.buyerUserId))]),
    ]);
    return views.map((view) => withPartyNames(view, sellerNames, buyerNames));
  }
}
