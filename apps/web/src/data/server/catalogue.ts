import 'server-only';
import {
  type CatalogueListing,
  type ListingListResponse,
  listingDetailSchema,
  listingListResponseSchema,
} from '@acme/api-contracts';

import { type CatalogueSearch, toApiQuery } from '../../features/catalogue/search-params.ts';
import { apiRequest } from '../api-client.ts';
import { ApiError } from '../api-error.ts';

/**
 * The buyer catalogue (UC-006): a genuinely public read, so it is deliberately unauthenticated —
 * anonymous browsing must not touch the session and must survive without one (UC-001
 * preconditions). Multi-value params (`brand`) need a repeated key, so the query string is built
 * by the feature's own serializer rather than the client's flat `query` record.
 */
export const browseCatalogue = (search: CatalogueSearch): Promise<ListingListResponse> =>
  apiRequest({
    path: `/api/listings?${toApiQuery(search)}`,
    schema: listingListResponseSchema,
    authenticated: false,
  });

/**
 * One published listing for a buyer (UC-012). Unauthenticated for the same reason the catalogue
 * is: reading a listing is public, and must work with no session at all.
 *
 * `null` means "not available to a buyer", which the backend answers identically for an unknown
 * id, a draft, and a deactivated seller's listing (UC-012 A5/E1) — the web app must not try to
 * tell them apart. A draft can only reach here through a privileged route, never this one, so
 * the published shape is the only one a buyer page has to render.
 */
export const getPublicListing = async (listingId: string): Promise<CatalogueListing | null> => {
  try {
    const listing = await apiRequest({
      path: `/api/listings/${encodeURIComponent(listingId)}`,
      schema: listingDetailSchema,
      authenticated: false,
    });
    return listing.status === 'draft' ? null : listing;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }
    throw error;
  }
};
