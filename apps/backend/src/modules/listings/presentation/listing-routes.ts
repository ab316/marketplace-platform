import {
  browseListingsQuerySchema,
  createListingRequestSchema,
  listingIdParamsSchema,
  paginationQuerySchema,
  updateListingRequestSchema,
} from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import {
  getOptionalActor,
  requireSellerActor,
} from '../../../shared/presentation/request-actor.ts';
import { parseRequest } from '../../../shared/presentation/validation.ts';
import type { ListingsModuleApi } from '../listings.api.ts';
import { toListingListResponse, toListingResponse } from './listing-presenter.ts';

export const registerListingRoutes = (app: FastifyInstance, listings: ListingsModuleApi): void => {
  // --- Buyer-facing catalogue -------------------------------------------------------------

  app.get('/api/listings', async (request, reply) => {
    const query = parseRequest(browseListingsQuerySchema, request.query, 'query');

    const page = await listings.browseActiveListings.execute({
      keyword: query.q,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.status(200).send(toListingListResponse(page));
  });

  app.get('/api/listings/:listingId', async (request, reply) => {
    const params = parseRequest(listingIdParamsSchema, request.params, 'params');
    const actor = getOptionalActor(request);

    const view = await listings.getListingDetail.execute({
      listingId: params.listingId,
      viewerOrganizationId: actor?.organizationId ?? undefined,
    });

    return reply.status(200).send(toListingResponse(view));
  });

  // --- Seller listing management ----------------------------------------------------------

  app.get('/api/seller/listings', async (request, reply) => {
    const actor = requireSellerActor(request);
    const query = parseRequest(paginationQuerySchema, request.query, 'query');

    const page = await listings.listOrganizationListings.execute({
      actor: { userId: actor.userId, organizationId: actor.organizationId },
      limit: query.limit,
      offset: query.offset,
    });

    return reply.status(200).send(toListingListResponse(page));
  });

  app.post('/api/listings', async (request, reply) => {
    const actor = requireSellerActor(request);
    const body = parseRequest(createListingRequestSchema, request.body, 'body');

    const view = await listings.createListingDraft.execute({
      actor: { userId: actor.userId, organizationId: actor.organizationId },
      title: body.title,
      description: body.description,
      specifications: body.specifications,
      condition: body.condition,
      priceMinor: body.priceMinor,
      currency: body.currency,
      quantityTotal: body.quantityTotal,
      fulfillmentExpectations: body.fulfillmentExpectations,
    });

    return reply.status(201).send(toListingResponse(view));
  });

  app.patch('/api/listings/:listingId', async (request, reply) => {
    const actor = requireSellerActor(request);
    const params = parseRequest(listingIdParamsSchema, request.params, 'params');
    const body = parseRequest(updateListingRequestSchema, request.body, 'body');

    const view = await listings.updateListingDraft.execute({
      actor: { userId: actor.userId, organizationId: actor.organizationId },
      listingId: params.listingId,
      ...body,
    });

    return reply.status(200).send(toListingResponse(view));
  });

  app.post('/api/listings/:listingId/publish', async (request, reply) => {
    const actor = requireSellerActor(request);
    const params = parseRequest(listingIdParamsSchema, request.params, 'params');

    const view = await listings.publishListing.execute({
      actor: { userId: actor.userId, organizationId: actor.organizationId },
      listingId: params.listingId,
    });

    return reply.status(200).send(toListingResponse(view));
  });

  app.post('/api/listings/:listingId/archive', async (request, reply) => {
    const actor = requireSellerActor(request);
    const params = parseRequest(listingIdParamsSchema, request.params, 'params');

    const view = await listings.archiveListing.execute({
      actor: { userId: actor.userId, organizationId: actor.organizationId },
      listingId: params.listingId,
    });

    return reply.status(200).send(toListingResponse(view));
  });
};
