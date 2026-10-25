import { type PagedListings, toListingView } from '../listing-view.ts';
import type { ListingRepository } from '../ports.ts';

export interface ListOrganizationListingsQuery {
  /**
   * The organization whose listings to return. The caller has already proved it may read this
   * organization — as a member, or as marketplace staff (UC-003 A1).
   */
  readonly organizationId: string;
  readonly limit: number;
  readonly offset: number;
}

/** An organization's listings in every status, including archived ones (UC-001 A5). */
export class ListOrganizationListings {
  readonly #listings: ListingRepository;

  constructor(listings: ListingRepository) {
    this.#listings = listings;
  }

  async execute(query: ListOrganizationListingsQuery): Promise<PagedListings> {
    const page = await this.#listings.findByOrganization({
      organizationId: query.organizationId,
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
