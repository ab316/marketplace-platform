import 'server-only';
import {
  type SellerListing,
  type SellerListingListResponse,
  sellerListingListResponseSchema,
  sellerListingSchema,
} from '@acme/api-contracts';

import { apiRequest } from '../api-client.ts';
import { ApiError } from '../api-error.ts';

export const SELLER_LISTINGS_PAGE_SIZE = 20;

/**
 * The caller's organization's listings in every status (UC-010). The backend derives the
 * organization from the session's membership, so nothing here can ask for another one.
 */
export const listSellerListings = (page: number): Promise<SellerListingListResponse> =>
  apiRequest({
    path: '/api/seller/listings',
    query: {
      limit: SELLER_LISTINGS_PAGE_SIZE,
      offset: (page - 1) * SELLER_LISTINGS_PAGE_SIZE,
    },
    schema: sellerListingListResponseSchema,
  });

/**
 * One listing of the caller's own organization, or `null`. A listing of another organization is
 * `null` too, even when it is public: the seller area only ever shows the member's own listings
 * (design: "A listing of another organization").
 */
export const getSellerListing = async (
  listingId: string,
  organizationId: string
): Promise<SellerListing | null> => {
  try {
    const listing = await apiRequest({
      path: `/api/listings/${encodeURIComponent(listingId)}`,
      schema: sellerListingSchema,
    });
    return listing.organizationId === organizationId ? listing : null;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }
    throw error;
  }
};
