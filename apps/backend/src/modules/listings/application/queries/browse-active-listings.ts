import type { ConditionGrade } from '../../domain/listing.ts';
import {
  type PagedListings,
  type PublishedListingView,
  toPublishedListingView,
} from '../listing-view.ts';
import type { CatalogueSort, ListingRepository, OrganizationDirectory } from '../ports.ts';

export interface BrowseActiveListingsQuery {
  readonly keyword?: string | undefined;
  readonly brands?: readonly string[] | undefined;
  readonly priceMinMinor?: number | undefined;
  readonly priceMaxMinor?: number | undefined;
  readonly minimumGrade?: ConditionGrade | undefined;
  readonly minimumRamGb?: number | undefined;
  readonly sort?: CatalogueSort | undefined;
  readonly limit: number;
  readonly offset: number;
}

/**
 * The buyer-facing catalogue (UC-006): active listings with at least one unit available to order,
 * refined by keyword and filters, in an explicit buyer-chosen order. Drafts, archives, and
 * sold-out listings stay hidden.
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

  async execute(query: BrowseActiveListingsQuery): Promise<PagedListings<PublishedListingView>> {
    const page = await this.#listings.searchActive({
      keyword: query.keyword,
      brands: query.brands,
      priceMinMinor: query.priceMinMinor,
      priceMaxMinor: query.priceMaxMinor,
      minimumGrade: query.minimumGrade,
      minimumRamGb: query.minimumRamGb,
      sort: query.sort ?? 'newest',
      excludedOrganizationIds: await this.#organizations.deactivatedOrganizationIds(),
      limit: query.limit,
      offset: query.offset,
    });

    return {
      items: page.items.map(toPublishedListingView),
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
