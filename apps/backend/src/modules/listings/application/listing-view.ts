import type { Currency } from '@acme/core-domain';

import type {
  DraftCondition,
  DraftSpecifications,
  Listing,
  ListingCondition,
  ListingReadiness,
  ListingSpecifications,
  PublishedListingStatus,
} from '../domain/listing.ts';

interface PriceView {
  readonly amountMinor: number;
  readonly currency: Currency;
}

/** An active or archived listing: complete. The only shape buyers and orders ever see. */
export interface PublishedListingView {
  readonly id: string;
  readonly organizationId: string;
  readonly status: PublishedListingStatus;
  readonly title: string;
  readonly description: string;
  readonly specifications: ListingSpecifications;
  readonly condition: ListingCondition;
  readonly price: PriceView;
  readonly totalQuantity: number;
  readonly reservedQuantity: number;
  readonly soldQuantity: number;
  readonly availableQuantity: number;
  readonly fulfillmentExpectations: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly publishedAt: Date;
  readonly archivedAt: Date | null;
}

/** A draft as its organization sees it: any field may be missing; readiness says what is. */
export interface DraftListingView {
  readonly id: string;
  readonly organizationId: string;
  readonly status: 'draft';
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly specifications: DraftSpecifications;
  readonly condition: DraftCondition;
  readonly price?: PriceView | undefined;
  readonly totalQuantity?: number | undefined;
  readonly fulfillmentExpectations?: string | undefined;
  readonly readiness: ListingReadiness;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Plain read model returned across the module boundary, so callers never hold the aggregate. */
export type ListingView = DraftListingView | PublishedListingView;

/** Who is selling, as a buyer sees it (UC-012). Seller-facing views do not carry it. */
export interface SellerSummaryView {
  readonly organizationId: string;
  readonly name: string;
}

/** A listing view on a buyer-facing route, named with its seller. */
export type WithSeller<T extends ListingView> = T & { readonly seller: SellerSummaryView };

export const withSeller = <T extends ListingView>(
  view: T,
  seller: SellerSummaryView
): WithSeller<T> => ({ ...view, seller });

export interface PagedListings<T extends ListingView = ListingView> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export const toListingView = (listing: Listing): ListingView => {
  const state = listing.state;
  if (state.status === 'draft') {
    return {
      id: state.id,
      organizationId: state.organizationId,
      status: state.status,
      title: state.title,
      description: state.description,
      specifications: state.specifications,
      condition: state.condition,
      price: state.price?.toJSON(),
      totalQuantity: state.totalQuantity,
      fulfillmentExpectations: state.fulfillmentExpectations,
      readiness: listing.readiness(),
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    };
  }

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
    soldQuantity: state.soldQuantity,
    availableQuantity: listing.availableQuantity,
    fulfillmentExpectations: state.fulfillmentExpectations,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    publishedAt: state.publishedAt,
    archivedAt: state.archivedAt,
  };
};

/**
 * For listings the caller has already established are published — the catalogue, a reservation.
 * A draft here is a programming error, not a user error.
 */
export const toPublishedListingView = (listing: Listing): PublishedListingView => {
  const view = toListingView(listing);
  if (view.status === 'draft') {
    throw new Error(`Listing ${listing.id} is a draft where a published listing was expected.`);
  }
  return view;
};
