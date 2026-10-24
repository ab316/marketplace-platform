import type { Currency } from '@acme/core-domain';

import type { ListingSnapshot } from '../domain/listing-snapshot.ts';
import type { CancellationReason, Order, OrderStatus, TimelineEntry } from '../domain/order.ts';

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
}

export interface PagedOrders {
  readonly items: readonly OrderView[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export const toOrderView = (order: Order): OrderView => {
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
  };
};
