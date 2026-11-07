import type { ConditionGrade } from '../../domain/listing.ts';
import {
  type PagedListings,
  type PublishedListingView,
  type WithSeller,
  toPublishedListingView,
  withSeller,
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

  async execute(
    query: BrowseActiveListingsQuery
  ): Promise<PagedListings<WithSeller<PublishedListingView>>> {
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

    // One read for the page, so naming the seller costs no round trip per row (P1-020).
    const sellers = await this.#organizations.findSellers([
      ...new Set(page.items.map((listing) => listing.organizationId)),
    ]);
    const byId = new Map(sellers.map((seller) => [seller.organizationId, seller]));

    const items = page.items.flatMap((listing) => {
      const seller = byId.get(listing.organizationId);

      // A listing nobody can be shown as the seller of is not offered. Organizations are never
      // deleted (PD-0003), so this is broken data, not a seller that went away — dropping the row
      // keeps the rest of the catalogue readable, while `total` still counts what the search
      // matched.
      if (seller === undefined) {
        return [];
      }

      return [
        withSeller(toPublishedListingView(listing), {
          organizationId: seller.organizationId,
          name: seller.name,
        }),
      ];
    });

    return {
      items,
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
