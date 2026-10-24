import type { Order } from '../domain/order.ts';

export class OrderNotFoundError extends Error {
  readonly code = 'ORDER_NOT_FOUND';

  constructor(orderId: string) {
    super(`Order ${orderId} not found`);
    this.name = 'OrderNotFoundError';
  }
}

export class ForbiddenOrderAccessError extends Error {
  readonly code = 'FORBIDDEN_ORDER_ACCESS';

  constructor() {
    super('Order belongs to a different buyer');
    this.name = 'ForbiddenOrderAccessError';
  }
}

export class OrderVersionConflictError extends Error {
  readonly code = 'ORDER_VERSION_CONFLICT';

  constructor(orderId: string) {
    super(`Order ${orderId} was modified concurrently`);
    this.name = 'OrderVersionConflictError';
  }
}

export type OrderRepository = {
  insert(order: Order): Promise<void>;
  // Optimistic locking: fails with OrderVersionConflictError on stale version.
  update(order: Order): Promise<void>;
  findById(id: string): Promise<Order | undefined>;
};

// The slice of the listings public API the orders module depends on.
// Collaboration goes through the listings application layer only.
export type ListingsGateway = {
  reserveListingUnit(listingId: string): Promise<{
    props: {
      id: string;
      organizationId: string;
      title?: string | undefined;
      description?: string | undefined;
      brand?: string | undefined;
      model?: string | undefined;
      cpu?: string | undefined;
      ram?: string | undefined;
      storage?: string | undefined;
      screenSize?: string | undefined;
      conditionGrade?: 'A' | 'B' | 'C' | undefined;
      conditionGuarantees?:
        | {
            batteryHealthMinPercent?: number | undefined;
            batteryCycleCountMax?: number | undefined;
          }
        | undefined;
      knownDefects?: string | undefined;
      priceOre?: number | undefined;
      currency: 'SEK';
      fulfillmentExpectations?: string | undefined;
    };
  }>;
  releaseListingUnit(listingId: string): Promise<void>;
};
