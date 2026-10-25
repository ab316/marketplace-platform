import { type PagedListings, toListingView } from '../listing-view.ts';
import type { ListingRepository, OrganizationDirectory } from '../ports.ts';

export interface BrowseActiveListingsQuery {
  readonly keyword?: string | undefined;
  readonly limit: number;
  readonly offset: number;
}

/**
 * The buyer-facing catalogue: active listings only, so drafts and archives stay hidden.
 *
 * Listings from deactivated organizations are excluded too (UC-003 E6) — the seller is frozen,
 * not deleted, so their listings stop being discoverable while every record survives.
 */
export class BrowseActiveListings {
  readonly #listings: ListingRepository;
  readonly #organizations: OrganizationDirectory;

  constructor(listings: ListingRepository, organizations: OrganizationDirectory) {
    this.#listings = listings;
    this.#organizations = organizations;
  }

  async execute(query: BrowseActiveListingsQuery): Promise<PagedListings> {
    const page = await this.#listings.searchActive({
      keyword: query.keyword,
      excludedOrganizationIds: await this.#organizations.deactivatedOrganizationIds(),
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
