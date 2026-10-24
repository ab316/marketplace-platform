import { ListingAccessDeniedError, ListingNotFoundError } from '../domain/errors.ts';
import type { Listing } from '../domain/listing.ts';
import type { ListingRepository, SellerActor } from './ports.ts';

/** Loads a listing and checks the actor belongs to the owning organization (UC-001 E2). */
export const loadOwnedListing = async (
  listings: ListingRepository,
  listingId: string,
  actor: SellerActor
): Promise<Listing> => {
  const listing = await listings.findById(listingId);
  if (listing === null) {
    throw new ListingNotFoundError(listingId);
  }
  if (listing.organizationId !== actor.organizationId) {
    throw new ListingAccessDeniedError(listingId);
  }
  return listing;
};
