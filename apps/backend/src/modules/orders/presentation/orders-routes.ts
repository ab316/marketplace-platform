import { createOrderRequestSchema, type OrderResponse } from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import { idParamsSchema, parseOrThrow, resolveUserId } from '../../../shared/presentation/http.ts';
import type { OrdersService } from '../application/orders-service.ts';
import type { Order } from '../domain/order.ts';

export function toOrderResponse(order: Order): OrderResponse {
  const p = order.props;
  return {
    id: p.id,
    buyerId: p.buyerId,
    sellerOrganizationId: p.sellerOrganizationId,
    status: p.status,
    cancellationReason: p.cancellationReason,
    listingSnapshot: p.listingSnapshot,
    priceOre: p.priceOre,
    currency: p.currency,
    expiresAt: p.expiresAt.toISOString(),
    timeline: p.timeline.map((entry) => ({
      id: entry.id,
      type: entry.type,
      message: entry.message,
      nextStep: entry.nextStep,
      actorId: entry.actorId,
      occurredAt: entry.occurredAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
  };
}

export function registerOrdersRoutes(app: FastifyInstance, orders: OrdersService): void {
  app.post('/orders', async (request, reply) => {
    const { listingId } = parseOrThrow(createOrderRequestSchema, request.body);
    const order = await orders.createOrder({
      listingId,
      buyerId: resolveUserId(request),
    });
    return reply.status(201).send(toOrderResponse(order));
  });

  app.post('/orders/:id/cancel', async (request, reply) => {
    const { id } = parseOrThrow(idParamsSchema, request.params);
    const order = await orders.cancelOrder({
      orderId: id,
      buyerId: resolveUserId(request),
    });
    return reply.send(toOrderResponse(order));
  });

  app.get('/orders/:id', async (request, reply) => {
    const { id } = parseOrThrow(idParamsSchema, request.params);
    const order = await orders.getOrder({
      orderId: id,
      buyerId: resolveUserId(request),
    });
    return reply.send(toOrderResponse(order));
  });
}
