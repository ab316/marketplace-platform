import type {
  CatalogueListing as CatalogueListingResponse,
  ListingDetail as ListingDetailResponse,
  ListingDraft as ListingDraftResponse,
  Listing as ListingResponse,
  ListingListResponse,
  SellerListing as SellerListingResponse,
  SellerListingListResponse,
} from '@acme/api-contracts';

import type {
  DraftListingView,
  ListingView,
  PagedListings,
  PublishedListingView,
  WithSeller,
} from '../application/listing-view.ts';

/** A published listing: what buyers see. */
export const toListingResponse = (view: PublishedListingView): ListingResponse => ({
  id: view.id,
  organizationId: view.organizationId,
  status: view.status,
  title: view.title,
  description: view.description,
  specifications: view.specifications,
  condition: {
    grade: view.condition.grade,
    guarantees: {
      batteryHealthMinPercent: view.condition.guarantees.batteryHealthMinPercent,
      ...(view.condition.guarantees.batteryCycleMin === undefined
        ? {}
        : { batteryCycleMin: view.condition.guarantees.batteryCycleMin }),
      ...(view.condition.guarantees.batteryCycleMax === undefined
        ? {}
        : { batteryCycleMax: view.condition.guarantees.batteryCycleMax }),
    },
    knownDefects: view.condition.knownDefects,
  },
  price: view.price,
  totalQuantity: view.totalQuantity,
  reservedQuantity: view.reservedQuantity,
  soldQuantity: view.soldQuantity,
  availableQuantity: view.availableQuantity,
  fulfillmentExpectations: view.fulfillmentExpectations,
  createdAt: view.createdAt.toISOString(),
  updatedAt: view.updatedAt.toISOString(),
  publishedAt: view.publishedAt.toISOString(),
  archivedAt: view.archivedAt?.toISOString() ?? null,
});

/** A draft: every field is present in the response, `null` when not entered yet. */
export const toListingDraftResponse = (view: DraftListingView): ListingDraftResponse => {
  const { specifications: spec, condition } = view;
  return {
    id: view.id,
    organizationId: view.organizationId,
    status: view.status,
    title: view.title ?? null,
    description: view.description ?? null,
    specifications: {
      brand: spec.brand ?? null,
      model: spec.model ?? null,
      cpu: spec.cpu ?? null,
      ramGb: spec.ramGb ?? null,
      storageType: spec.storageType ?? null,
      storageGb: spec.storageGb ?? null,
      screenSizeInches: spec.screenSizeInches ?? null,
    },
    condition: {
      grade: condition.grade ?? null,
      guarantees: {
        batteryHealthMinPercent: condition.guarantees.batteryHealthMinPercent ?? null,
        batteryCycleMin: condition.guarantees.batteryCycleMin ?? null,
        batteryCycleMax: condition.guarantees.batteryCycleMax ?? null,
      },
      knownDefects: condition.knownDefects ?? null,
    },
    price: view.price ?? null,
    totalQuantity: view.totalQuantity ?? null,
    fulfillmentExpectations: view.fulfillmentExpectations ?? null,
    readiness: {
      ready: view.readiness.ready,
      issues: view.readiness.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    },
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
  };
};

/** A listing in any status, for its own organization and marketplace staff. */
export const toSellerListingResponse = (view: ListingView): SellerListingResponse =>
  view.status === 'draft' ? toListingDraftResponse(view) : toListingResponse(view);

/** A published listing as a buyer sees it: the listing plus who is selling it (UC-012). */
export const toCatalogueListingResponse = (
  view: WithSeller<PublishedListingView>
): CatalogueListingResponse => ({
  ...toListingResponse(view),
  seller: { organizationId: view.seller.organizationId, name: view.seller.name },
});

/** `GET /api/listings/:listingId`: the published shape for buyers, the draft for its owners. */
export const toListingDetailResponse = (view: WithSeller<ListingView>): ListingDetailResponse =>
  view.status === 'draft' ? toListingDraftResponse(view) : toCatalogueListingResponse(view);

export const toListingListResponse = (
  page: PagedListings<WithSeller<PublishedListingView>>
): ListingListResponse => ({
  items: page.items.map(toCatalogueListingResponse),
  total: page.total,
  limit: page.limit,
  offset: page.offset,
});

export const toSellerListingListResponse = (page: PagedListings): SellerListingListResponse => ({
  items: page.items.map(toSellerListingResponse),
  total: page.total,
  limit: page.limit,
  offset: page.offset,
});
