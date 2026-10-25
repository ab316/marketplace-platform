import type { Listing as ListingResponse, ListingListResponse } from '@acme/api-contracts';

import type { ListingView, PagedListings } from '../application/listing-view.ts';

export const toListingResponse = (view: ListingView): ListingResponse => ({
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
  publishedAt: view.publishedAt?.toISOString() ?? null,
  archivedAt: view.archivedAt?.toISOString() ?? null,
});

export const toListingListResponse = (page: PagedListings): ListingListResponse => ({
  items: page.items.map(toListingResponse),
  total: page.total,
  limit: page.limit,
  offset: page.offset,
});
