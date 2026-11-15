import type { Currency } from '@acme/core-domain';

import type { ListingSnapshot } from '../domain/listing-snapshot.ts';
import type {
  CancellationReason,
  Order,
  OrderStatus,
  PaymentStatus,
  TimelineEntry,
} from '../domain/order.ts';

export interface OrderView {
  readonly id: string;
  readonly buyerUserId: string;
  readonly sellerOrganizationId: string;
  readonly listingId: string;
  readonly status: OrderStatus;
  readonly cancellationReason: CancellationReason | null;
  readonly total: { readonly amountMinor: number; readonly currency: Currency };
  readonly listingSnapshot: ListingSnapshot;
  readonly timeline: readonly TimelineEntry[];
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly cancelledAt: Date | null;
  readonly payment: OrderPaymentView;
}

/** Where payment stands, in the buyer's terms (UC-004 scope decision 9). */
export interface OrderPaymentView {
  readonly status: PaymentStatus;
  readonly holdUntil: Date | null;
  readonly paidAt: Date | null;
  readonly attemptId: string | null;
  readonly feeRateBps: number | null;
}

/** The selling organization as the buyer sees it on the order (P1-020). */
export interface OrderSellerView {
  readonly organizationId: string;
  readonly name: string;
}

/** Who ordered, as the selling organization sees them (P1-023): display name only. */
export interface OrderBuyerView {
  readonly userId: string;
  readonly displayName: string;
}

/** An order view enriched with both parties, for every order response. */
export type NamedOrderView = OrderView & {
  readonly seller: OrderSellerView;
  readonly buyer: OrderBuyerView;
};

export interface PagedOrders {
  readonly items: readonly NamedOrderView[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

/**
 * Attaches both parties' names to an order view. Organizations and users are never deleted
 * (PD-0003), so a missing name means broken reference data; the id then stands in rather than
 * making the order unreadable.
 */
export const withPartyNames = (
  view: OrderView,
  sellerNames: ReadonlyMap<string, string>,
  buyerNames: ReadonlyMap<string, string>
): NamedOrderView => ({
  ...view,
  seller: {
    organizationId: view.sellerOrganizationId,
    name: sellerNames.get(view.sellerOrganizationId) ?? view.sellerOrganizationId,
  },
  buyer: {
    userId: view.buyerUserId,
    displayName: buyerNames.get(view.buyerUserId) ?? view.buyerUserId,
  },
});

export const toOrderView = (order: Order, now: Date): OrderView => {
  const state = order.state;
  return {
    id: state.id,
    buyerUserId: state.buyerUserId,
    sellerOrganizationId: state.sellerOrganizationId,
    listingId: state.listingId,
    status: state.status,
    cancellationReason: state.cancellationReason,
    total: state.total.toJSON(),
    listingSnapshot: state.listingSnapshot,
    timeline: state.timeline,
    createdAt: state.createdAt,
    expiresAt: state.expiresAt,
    cancelledAt: state.cancelledAt,
    payment: {
      status: order.paymentStatusAt(now),
      holdUntil: order.isHeldForPaymentAt(now) ? state.paymentHoldUntil : null,
      paidAt: state.paidAt,
      attemptId: state.paidByAttemptId,
      feeRateBps: state.feeRateBps,
    },
  };
};
