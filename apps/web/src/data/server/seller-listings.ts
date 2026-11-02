import 'server-only';
import {
  type Listing,
  type ListingListResponse,
  listingListResponseSchema,
  listingSchema,
} from '@acme/api-contracts';

import { SELLER_LISTINGS_PAGE_SIZE } from '../../features/seller-listings/paths.ts';
import { apiRequest } from '../api-client.ts';

/**
 * The seller's own listings (UC-007 S5, UC-008 W4). The backend resolves the organization from
 * the session's membership, so no organization id travels from the page — the membership check
 * is the only authorization in play (ADR-011 §4).
 */
export const listSellerListings = (page: number): Promise<ListingListResponse> =>
  apiRequest({
    path: '/api/seller/listings',
    query: {
      limit: SELLER_LISTINGS_PAGE_SIZE,
      offset: (page - 1) * SELLER_LISTINGS_PAGE_SIZE,
    },
    schema: listingListResponseSchema,
  });

/**
 * One listing as its owner sees it: drafts and archives included, because the request carries
 * the member's session. The page still checks the listing belongs to the member's organization
 * before rendering seller actions for it.
 */
export const getSellerListing = (listingId: string): Promise<Listing> =>
  apiRequest({
    path: `/api/listings/${encodeURIComponent(listingId)}`,
    schema: listingSchema,
  });
