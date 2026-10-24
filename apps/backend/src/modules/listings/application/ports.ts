import type { Listing } from '../domain/listing.ts';

export interface ListingSearchCriteria {
  /** Keyword matched against title, description, brand, and model. */
  readonly keyword?: string | undefined;
  readonly limit: number;
  readonly offset: number;
}

export interface OrganizationListingCriteria {
  readonly organizationId: string;
  readonly limit: number;
  readonly offset: number;
}

export interface ListingPage {
  readonly items: readonly Listing[];
  readonly total: number;
}

export interface ListingRepository {
  findById(listingId: string): Promise<Listing | null>;

  insert(listing: Listing): Promise<void>;

  /**
   * Persists a loaded aggregate using its version as an optimistic guard, so concurrent writers
   * cannot overwrite each other's stock changes. Throws `ListingConcurrencyError` when the stored
   * version has moved on.
   */
  save(listing: Listing): Promise<void>;

  /** Active listings only; this is the buyer-facing catalogue. */
  searchActive(criteria: ListingSearchCriteria): Promise<ListingPage>;

  /** Every listing owned by an organization, in any status. */
  findByOrganization(criteria: OrganizationListingCriteria): Promise<ListingPage>;
}

/** The organization member acting on a listing. Authentication itself is out of scope for UC-001. */
export interface SellerActor {
  readonly userId: string;
  readonly organizationId: string;
}
