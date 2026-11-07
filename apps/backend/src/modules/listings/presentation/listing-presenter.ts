import type {
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

export const toListingListResponse = (
  page: PagedListings<PublishedListingView>
): ListingListResponse => ({
  items: page.items.map(toListingResponse),
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
