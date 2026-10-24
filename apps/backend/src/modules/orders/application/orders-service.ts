import type { Clock, IdGenerator } from '@acme/core-contracts';

import { Order, type ListingSnapshot } from '../domain/order.ts';
import {
  ForbiddenOrderAccessError,
  OrderNotFoundError,
  type ListingsGateway,
  type OrderRepository,
} from './ports.ts';

export type OrdersServiceDeps = {
  orderRepository: OrderRepository;
  listings: ListingsGateway;
  clock: Clock;
  idGenerator: IdGenerator;
};

export function createOrdersService(deps: OrdersServiceDeps) {
  const { orderRepository, listings, clock, idGenerator } = deps;

  return {
    // UC-001 B3–B7: atomically-guarded reservation first (optimistic locking in
    // the listings module prevents oversell), then order creation with snapshot.
    async createOrder(input: { listingId: string; buyerId: string }): Promise<Order> {
      const listing = await listings.reserveListingUnit(input.listingId);
      const p = listing.props;

      // All snapshot fields are guaranteed present on an active (publishable-
      // validated) listing; reserveListingUnit rejects non-active listings.
      const required = <T>(value: T | undefined, field: string): T => {
        if (value === undefined) {
          throw new Error(`Active listing ${p.id} is missing required field "${field}"`);
        }
        return value;
      };
      const snapshot: ListingSnapshot = {
        listingId: p.id,
        title: required(p.title, 'title'),
        description: required(p.description, 'description'),
        brand: required(p.brand, 'brand'),
        model: required(p.model, 'model'),
        cpu: required(p.cpu, 'cpu'),
        ram: required(p.ram, 'ram'),
        storage: required(p.storage, 'storage'),
        screenSize: required(p.screenSize, 'screenSize'),
        conditionGrade: required(p.conditionGrade, 'conditionGrade'),
        conditionGuarantees: p.conditionGuarantees ?? {},
        knownDefects: required(p.knownDefects, 'knownDefects'),
        priceOre: required(p.priceOre, 'priceOre'),
        currency: p.currency,
        fulfillmentExpectations: required(p.fulfillmentExpectations, 'fulfillmentExpectations'),
      };

      const order = Order.create({
        id: idGenerator.next(),
        timelineEntryId: idGenerator.next(),
        buyerId: input.buyerId,
        sellerOrganizationId: p.organizationId,
        listingSnapshot: snapshot,
        now: clock.now(),
      });

      try {
        await orderRepository.insert(order);
      } catch (error) {
        // No cross-module transaction yet (deferred with DB transactions):
        // return the reserved unit on failure so reservations cannot leak.
        await listings.releaseListingUnit(input.listingId);
        throw error;
      }

      return order;
    },

    async cancelOrder(input: { orderId: string; buyerId: string }): Promise<Order> {
      const order = await orderRepository.findById(input.orderId);
      if (!order) {
        throw new OrderNotFoundError(input.orderId);
      }
      if (order.props.buyerId !== input.buyerId) {
        throw new ForbiddenOrderAccessError();
      }

      order.cancel({
        reason: 'buyer_cancelled',
        actorId: input.buyerId,
        timelineEntryId: idGenerator.next(),
        now: clock.now(),
      });
      await orderRepository.update(order);
      await listings.releaseListingUnit(order.props.listingSnapshot.listingId);
      return order;
    },

    async getOrder(input: { orderId: string; buyerId: string }): Promise<Order> {
      const order = await orderRepository.findById(input.orderId);
      if (!order) {
        throw new OrderNotFoundError(input.orderId);
      }
      if (order.props.buyerId !== input.buyerId) {
        throw new ForbiddenOrderAccessError();
      }
      return order;
    },
  };
}

export type OrdersService = ReturnType<typeof createOrdersService>;
