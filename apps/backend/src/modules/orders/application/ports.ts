import type { Currency } from '@acme/core-domain';

import type { SnapshotCondition, SnapshotSpecifications } from '../domain/listing-snapshot.ts';
import type { Order } from '../domain/order.ts';

export interface BuyerOrderCriteria {
  readonly buyerUserId: string;
  readonly limit: number;
  readonly offset: number;
}

export interface OrderPage {
  readonly items: readonly Order[];
  readonly total: number;
}

export interface OrderRepository {
  findById(orderId: string): Promise<Order | null>;

  insert(order: Order): Promise<void>;

  /** Optimistically guarded write; throws `OrderConcurrencyError` when the stored version moved. */
  save(order: Order): Promise<void>;

  findByBuyer(criteria: BuyerOrderCriteria): Promise<OrderPage>;

  /** Orders still awaiting payment whose reservation window has elapsed. */
  findExpired(now: Date, limit: number): Promise<readonly Order[]>;
}

/** What the listings module hands back when it reserves a unit. */
export interface ReservedListing {
  readonly listingId: string;
  readonly sellerOrganizationId: string;
  readonly title: string;
  readonly description: string;
  readonly specifications: SnapshotSpecifications;
  readonly condition: SnapshotCondition;
  readonly priceMinor: number;
  readonly currency: Currency;
  readonly fulfillmentExpectations: string;
}

/**
 * The orders module's view of listing stock. Implemented by an adapter over the listings module's
 * public API, so neither module reaches into the other's internals.
 */
export interface ListingReservations {
  /** Holds one unit, or rejects when the listing is not orderable. */
  reserve(listingId: string): Promise<ReservedListing>;
  release(listingId: string): Promise<void>;
}
