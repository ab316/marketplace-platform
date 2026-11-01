import 'server-only';
import { type ListingListResponse, listingListResponseSchema } from '@acme/api-contracts';

import { type CatalogueSearch, toApiQuery } from '../../features/catalogue/search-params.ts';
import { apiRequest } from '../api-client.ts';

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
