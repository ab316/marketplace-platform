import type { Currency } from '@acme/core-domain';

import type {
  Listing,
  ListingCondition,
  ListingSpecifications,
  ListingStatus,
} from '../domain/listing.ts';

/** Plain read model returned across the module boundary, so callers never hold the aggregate. */
export interface ListingView {
  readonly id: string;
  readonly organizationId: string;
  readonly status: ListingStatus;
  readonly title: string;
  readonly description: string;
  readonly specifications: ListingSpecifications;
  readonly condition: ListingCondition;
  readonly price: { readonly amountMinor: number; readonly currency: Currency };
  readonly totalQuantity: number;
  readonly reservedQuantity: number;
  readonly availableQuantity: number;
  readonly fulfillmentExpectations: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly publishedAt: Date | null;
  readonly archivedAt: Date | null;
}

export interface PagedListings {
  readonly items: readonly ListingView[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export const toListingView = (listing: Listing): ListingView => {
  const state = listing.state;
  return {
    id: state.id,
    organizationId: state.organizationId,
    status: state.status,
    title: state.title,
    description: state.description,
    specifications: state.specifications,
    condition: state.condition,
    price: state.price.toJSON(),
    totalQuantity: state.totalQuantity,
    reservedQuantity: state.reservedQuantity,
    availableQuantity: listing.availableQuantity,
    fulfillmentExpectations: state.fulfillmentExpectations,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    publishedAt: state.publishedAt,
    archivedAt: state.archivedAt,
  };
};
