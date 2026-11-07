import {
  browseListingsQuerySchema,
  createListingRequestSchema,
  listingIdParamsSchema,
  organizationIdParamsSchema,
  paginationQuerySchema,
  updateListingRequestSchema,
} from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import {
  getOptionalActor,
  requireMembership,
  requirePlatformAdmin,
} from '../../../shared/presentation/request-actor.ts';
import { parseRequest } from '../../../shared/presentation/validation.ts';
import type { ListingsModuleApi } from '../listings.api.ts';
import {
  toListingDetailResponse,
  toListingListResponse,
  toListingResponse,
  toSellerListingListResponse,
  toSellerListingResponse,
} from './listing-presenter.ts';

export const registerListingRoutes = (app: FastifyInstance, listings: ListingsModuleApi): void => {
  // --- Buyer-facing catalogue -------------------------------------------------------------

  app.get('/api/listings', async (request, reply) => {
    const query = parseRequest(browseListingsQuerySchema, request.query, 'query');

    const page = await listings.browseActiveListings.execute({
      keyword: query.q,
      brands: query.brand,
      priceMinMinor: query.priceMin,
      priceMaxMinor: query.priceMax,
      minimumGrade: query.grade,
      minimumRamGb: query.ramMin,
      sort: query.sort,
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
      viewerOrganizationId: actor?.membership?.organizationId,
      viewerIsPlatformAdmin: actor?.isPlatformAdmin,
    });

    // Buyers only ever get a published listing here; drafts reach their organization and staff.
    return reply.status(200).send(toListingDetailResponse(view));
  });

  // --- Seller listing management ----------------------------------------------------------

  app.get('/api/seller/listings', async (request, reply) => {
    const { organizationId } = requireMembership(request, 'listings:read');
    const query = parseRequest(paginationQuerySchema, request.query, 'query');

    const page = await listings.listOrganizationListings.execute({
      organizationId,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.status(200).send(toSellerListingListResponse(page));
  });

  // Marketplace staff inspect any organization's catalogue, in every status (UC-003 A1).
  app.get('/api/admin/organizations/:organizationId/listings', async (request, reply) => {
    requirePlatformAdmin(request);
    const params = parseRequest(organizationIdParamsSchema, request.params, 'params');
    const query = parseRequest(paginationQuerySchema, request.query, 'query');

    const page = await listings.listOrganizationListings.execute({
      organizationId: params.organizationId,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.status(200).send(toSellerListingListResponse(page));
  });

  // Drafts may be incomplete (UC-005, P1-012): every field is optional, `{}` is a valid body.
  app.post('/api/listings', async (request, reply) => {
    const { actor, organizationId } = requireMembership(request, 'listings:write');
    const body = parseRequest(createListingRequestSchema, request.body, 'body');

    const view = await listings.createListingDraft.execute({
      actor: { userId: actor.userId, organizationId },
      ...body,
    });

    return reply.status(201).send(toSellerListingResponse(view));
  });

  app.patch('/api/listings/:listingId', async (request, reply) => {
    const { actor, organizationId } = requireMembership(request, 'listings:write');
    const params = parseRequest(listingIdParamsSchema, request.params, 'params');
    const body = parseRequest(updateListingRequestSchema, request.body, 'body');

    const view = await listings.updateListingDraft.execute({
      actor: { userId: actor.userId, organizationId },
      listingId: params.listingId,
      ...body,
    });

    return reply.status(200).send(toSellerListingResponse(view));
  });

  app.post('/api/listings/:listingId/publish', async (request, reply) => {
    const { actor, organizationId } = requireMembership(request, 'listings:write');
    const params = parseRequest(listingIdParamsSchema, request.params, 'params');

    const view = await listings.publishListing.execute({
      actor: { userId: actor.userId, organizationId },
      listingId: params.listingId,
    });

    return reply.status(200).send(toListingResponse(view));
  });

  app.post('/api/listings/:listingId/archive', async (request, reply) => {
    const { actor, organizationId } = requireMembership(request, 'listings:write');
    const params = parseRequest(listingIdParamsSchema, request.params, 'params');

    const view = await listings.archiveListing.execute({
      actor: { userId: actor.userId, organizationId },
      listingId: params.listingId,
    });

    return reply.status(200).send(toListingResponse(view));
  });
};
