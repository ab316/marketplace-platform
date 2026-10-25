import type { Listing } from '../domain/listing.ts';

export interface ListingSearchCriteria {
  /** Keyword matched against title, description, brand, and model. */
  readonly keyword?: string | undefined;
  /** Sellers whose listings are hidden from buyers because they are deactivated (UC-003 E6). */
  readonly excludedOrganizationIds?: readonly string[] | undefined;
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

/**
 * The organization member acting on a listing. The caller has already been authenticated and
 * checked for the right role (UC-003); this module only enforces that the listing belongs to the
 * organization the actor is acting for.
 */
export interface SellerActor {
  readonly userId: string;
  readonly organizationId: string;
}

/**
 * Whether a seller organization may currently transact. Owned by the identity module and adapted
 * in `src/bootstrap/`, so listings never import identity's internals.
 */
export interface OrganizationDirectory {
  deactivatedOrganizationIds(): Promise<readonly string[]>;

  isActive(organizationId: string): Promise<boolean>;
}
