import {
  createOrderRequestSchema,
  listOrdersQuerySchema,
  orderIdParamsSchema,
} from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import { requireActor, requireMembership } from '../../../shared/presentation/request-actor.ts';
import { parseRequest } from '../../../shared/presentation/validation.ts';
import type { OrdersModuleApi } from '../orders.api.ts';
import { toOrderListResponse, toOrderResponse } from './order-presenter.ts';

export const registerOrderRoutes = (app: FastifyInstance, orders: OrdersModuleApi): void => {
  app.post('/api/orders', async (request, reply) => {
    const actor = requireActor(request);
    const body = parseRequest(createOrderRequestSchema, request.body, 'body');

    const view = await orders.createOrder.execute({
      buyer: {
        userId: actor.userId,
        organizationId: actor.membership?.organizationId ?? null,
        isPlatformAdmin: actor.isPlatformAdmin,
      },
      listingId: body.listingId,
    });

    request.log.info(
      { orderId: view.id, listingId: body.listingId, buyerUserId: actor.userId },
      'order created'
    );

    return reply.status(201).send(toOrderResponse(view));
  });

  app.get('/api/orders/:orderId', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(orderIdParamsSchema, request.params, 'params');

    const view = await orders.getOrder.execute({
      orderId: params.orderId,
      viewerUserId: actor.userId,
      viewerOrganizationId: actor.membership?.organizationId,
      viewerIsPlatformAdmin: actor.isPlatformAdmin,
    });

    return reply.status(200).send(toOrderResponse(view));
  });

  app.post('/api/orders/:orderId/cancel', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(orderIdParamsSchema, request.params, 'params');

    const view = await orders.cancelOrder.execute({
      orderId: params.orderId,
      actorUserId: actor.userId,
    });

    return reply.status(200).send(toOrderResponse(view));
  });

  app.get('/api/buyer/orders', async (request, reply) => {
    const actor = requireActor(request);
    const query = parseRequest(listOrdersQuerySchema, request.query, 'query');

    const page = await orders.listBuyerOrders.execute({
      buyerUserId: actor.userId,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.status(200).send(toOrderListResponse(page));
  });

  // UC-015 R1: the orders the caller's organization received. Any member role reads (spec D2);
  // the organization comes from membership, never from the request.
  app.get('/api/seller/orders', async (request, reply) => {
    const { organizationId } = requireMembership(request, 'orders:read');
    const query = parseRequest(listOrdersQuerySchema, request.query, 'query');

    const page = await orders.listOrganizationOrders.execute({
      sellerOrganizationId: organizationId,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.status(200).send(toOrderListResponse(page));
  });
};
