import type { Listing } from '../domain/listing.ts';

export class ListingNotFoundError extends Error {
  readonly code = 'LISTING_NOT_FOUND';

  constructor(listingId: string) {
    super(`Listing ${listingId} not found`);
    this.name = 'ListingNotFoundError';
  }
}

// Saving a stale version must fail so concurrent reservations can never
// oversell pooled stock (optimistic locking; engineering standard §1.8).
export class ListingVersionConflictError extends Error {
  readonly code = 'LISTING_VERSION_CONFLICT';

  constructor(listingId: string) {
    super(`Listing ${listingId} was modified concurrently`);
    this.name = 'ListingVersionConflictError';
  }
}

export type ListingRepository = {
  insert(listing: Listing): Promise<void>;
  // Persists changes if the stored version still matches listing.props.version,
  // then bumps the version; throws ListingVersionConflictError otherwise.
  update(listing: Listing): Promise<void>;
  findById(id: string): Promise<Listing | undefined>;
  searchActive(search?: string): Promise<Listing[]>;
};
