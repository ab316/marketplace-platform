import type {
  ListingSnapshot as ListingSnapshotResponse,
  Order as OrderResponse,
  OrderListResponse,
  OrderTimelineEntry,
} from '@acme/api-contracts';

import type { OrderView, PagedOrders } from '../application/order-view.ts';
import type { ListingSnapshot } from '../domain/listing-snapshot.ts';
import type { TimelineEntry } from '../domain/order.ts';

const toSnapshotResponse = (snapshot: ListingSnapshot): ListingSnapshotResponse => ({
  listingId: snapshot.listingId,
  sellerOrganizationId: snapshot.sellerOrganizationId,
  title: snapshot.title,
  description: snapshot.description,
  specifications: snapshot.specifications,
  condition: {
    grade: snapshot.condition.grade,
    guarantees: {
      batteryHealthMinPercent: snapshot.condition.guarantees.batteryHealthMinPercent,
      ...(snapshot.condition.guarantees.batteryCycleMin === undefined
        ? {}
        : { batteryCycleMin: snapshot.condition.guarantees.batteryCycleMin }),
      ...(snapshot.condition.guarantees.batteryCycleMax === undefined
        ? {}
        : { batteryCycleMax: snapshot.condition.guarantees.batteryCycleMax }),
    },
    knownDefects: snapshot.condition.knownDefects,
  },
  price: snapshot.price.toJSON(),
  fulfillmentExpectations: snapshot.fulfillmentExpectations,
  capturedAt: snapshot.capturedAt.toISOString(),
});

/**
 * Turns a stored timeline entry into plain language. The timeline has to answer what happened and
 * what happens next, so the wording lives here rather than in persisted data that would freeze it.
 */
const describe = (
  entry: TimelineEntry,
  order: OrderView
): { title: string; description: string; nextStep: string | null } => {
  if (entry.type === 'order_created') {
    return {
      title: 'Order created',
      description: `One unit of “${order.listingSnapshot.title}” is reserved for this order.`,
      nextStep: `Pay to secure this order. Unpaid orders are released on ${order.expiresAt.toISOString()}.`,
    };
  }

  const expired = entry.details['reason'] === 'expired';
  return {
    title: expired ? 'Order expired' : 'Order cancelled',
    description: expired
      ? 'The order was not paid within the reservation window, so the reserved unit went back on sale.'
      : 'The buyer cancelled this order before payment, so the reserved unit went back on sale.',
    nextStep: null,
  };
};

const toTimelineEntryResponse = (entry: TimelineEntry, order: OrderView): OrderTimelineEntry => ({
  id: entry.id,
  sequence: entry.sequence,
  type: entry.type,
  occurredAt: entry.occurredAt.toISOString(),
  actorUserId: entry.actorUserId,
  ...describe(entry, order),
});

export const toOrderResponse = (view: OrderView): OrderResponse => ({
  id: view.id,
  status: view.status,
  buyerUserId: view.buyerUserId,
  sellerOrganizationId: view.sellerOrganizationId,
  listingId: view.listingId,
  quantity: 1,
  total: view.total,
  listingSnapshot: toSnapshotResponse(view.listingSnapshot),
  createdAt: view.createdAt.toISOString(),
  expiresAt: view.expiresAt.toISOString(),
  cancelledAt: view.cancelledAt?.toISOString() ?? null,
  cancellationReason: view.cancellationReason,
  timeline: view.timeline.map((entry) => toTimelineEntryResponse(entry, view)),
});

export const toOrderListResponse = (page: PagedOrders): OrderListResponse => ({
  items: page.items.map(toOrderResponse),
  total: page.total,
  limit: page.limit,
  offset: page.offset,
});
