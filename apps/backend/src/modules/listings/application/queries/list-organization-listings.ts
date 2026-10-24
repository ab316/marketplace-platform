import { type PagedListings, toListingView } from '../listing-view.ts';
import type { ListingRepository, SellerActor } from '../ports.ts';

export interface ListOrganizationListingsQuery {
  readonly actor: SellerActor;
  readonly limit: number;
  readonly offset: number;
}

/** The seller's own listings in every status, including archived ones (UC-001 A5). */
export class ListOrganizationListings {
  readonly #listings: ListingRepository;

  constructor(listings: ListingRepository) {
    this.#listings = listings;
  }

  async execute(query: ListOrganizationListingsQuery): Promise<PagedListings> {
    const page = await this.#listings.findByOrganization({
      organizationId: query.actor.organizationId,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      items: page.items.map(toListingView),
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
