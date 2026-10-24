import { type PagedListings, toListingView } from '../listing-view.ts';
import type { ListingRepository } from '../ports.ts';

export interface BrowseActiveListingsQuery {
  readonly keyword?: string | undefined;
  readonly limit: number;
  readonly offset: number;
}

/** The buyer-facing catalogue: active listings only, so drafts and archives stay hidden. */
export class BrowseActiveListings {
  readonly #listings: ListingRepository;

  constructor(listings: ListingRepository) {
    this.#listings = listings;
  }

  async execute(query: BrowseActiveListingsQuery): Promise<PagedListings> {
    const page = await this.#listings.searchActive({
      keyword: query.keyword,
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
