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
  switch (entry.type) {
    case 'order_created':
      return {
        title: 'Order created',
        description: `One unit of “${order.listingSnapshot.title}” is reserved for this order.`,
        nextStep: `Pay to secure this order. Unpaid orders are released on ${order.expiresAt.toISOString()}.`,
      };
    case 'order_cancelled': {
      const expired = entry.details['reason'] === 'expired';
      return {
        title: expired ? 'Order expired' : 'Order cancelled',
        description: expired
          ? 'The order was not paid within the reservation window, so the reserved unit went back on sale.'
          : 'The buyer cancelled this order before payment, so the reserved unit went back on sale.',
        nextStep: null,
      };
    }
    case 'payment_secured':
      return {
        title: 'Payment secured',
        description:
          'Your payment is held safely in escrow for this order until you confirm delivery.',
        nextStep: 'The seller will start fulfillment.',
      };
    case 'payment_failed': {
      const timedOut = entry.details['reason'] === 'provider_timeout';
      return {
        title: timedOut ? 'Payment not completed' : 'Payment failed',
        description: timedOut
          ? 'The payment provider did not respond in time, so no money was taken.'
          : 'The payment provider declined the payment, so no money was taken.',
        nextStep:
          order.status === 'awaiting_payment'
            ? `Try again before the order expires on ${order.expiresAt.toISOString()}.`
            : null,
      };
    }
    case 'payment_returned':
      return {
        title: 'Payment returned',
        description:
          entry.details['reason'] === 'order_already_paid'
            ? 'This order had already been paid by an earlier payment, so the second payment is on its way back to you.'
            : 'The reservation had already lapsed when this payment arrived, so your money is on its way back to you.',
        nextStep:
          order.status === 'cancelled' ? 'Place a new order if you still want this item.' : null,
      };
    default: {
      const unhandled: never = entry.type;
      throw new Error(`Unhandled timeline entry type: ${String(unhandled)}`);
    }
  }
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
  payment: {
    status: view.payment.status,
    holdUntil: view.payment.holdUntil?.toISOString() ?? null,
    paidAt: view.payment.paidAt?.toISOString() ?? null,
    attemptId: view.payment.attemptId,
    feeRateBps: view.payment.feeRateBps,
  },
  timeline: view.timeline.map((entry) => toTimelineEntryResponse(entry, view)),
});

export const toOrderListResponse = (page: PagedOrders): OrderListResponse => ({
  items: page.items.map(toOrderResponse),
  total: page.total,
  limit: page.limit,
  offset: page.offset,
});
