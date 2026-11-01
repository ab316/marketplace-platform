import type { ConditionGrade, Listing } from '../domain/listing.ts';

export type CatalogueSort = 'newest' | 'price_asc' | 'price_desc';

export interface ListingSearchCriteria {
  /** Keyword matched against title, description, brand, and model. */
  readonly keyword?: string | undefined;
  /** Brands matched case-insensitively against the listing's brand; OR within the list (UC-006). */
  readonly brands?: readonly string[] | undefined;
  /** Inclusive price bounds in SEK minor units (UC-006 Q4). */
  readonly priceMinMinor?: number | undefined;
  readonly priceMaxMinor?: number | undefined;
  /** Minimum condition grade, inclusive of better grades: B means A or B (UC-006). */
  readonly minimumGrade?: ConditionGrade | undefined;
  /** Inclusive minimum memory in GB (UC-006 Q3). */
  readonly minimumRamGb?: number | undefined;
  /** Defaults to `newest`. Every sort breaks ties on id so pagination is repeatable (UC-006 B7). */
  readonly sort?: CatalogueSort | undefined;
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

  /**
   * The buyer-facing catalogue: active listings with at least one unit available to order
   * (UC-006 Q1 — a fully reserved or sold-out listing is not shown).
   */
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
