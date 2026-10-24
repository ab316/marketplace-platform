import {
  browseListingsQuerySchema,
  createListingDraftRequestSchema,
  updateListingDraftRequestSchema,
  type ListingResponse,
} from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import {
  idParamsSchema,
  parseOrThrow,
  resolveOrganizationId,
} from '../../../shared/presentation/http.ts';
import type { ListingsService } from '../application/listings-service.ts';
import type { Listing } from '../domain/listing.ts';

export function toListingResponse(listing: Listing): ListingResponse {
  const p = listing.props;
  return {
    id: p.id,
    organizationId: p.organizationId,
    status: p.status,
    currency: p.currency,
    quantityAvailable: p.quantityAvailable,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    ...(p.title !== undefined && { title: p.title }),
    ...(p.description !== undefined && { description: p.description }),
    ...(p.brand !== undefined && { brand: p.brand }),
    ...(p.model !== undefined && { model: p.model }),
    ...(p.cpu !== undefined && { cpu: p.cpu }),
    ...(p.ram !== undefined && { ram: p.ram }),
    ...(p.storage !== undefined && { storage: p.storage }),
    ...(p.screenSize !== undefined && { screenSize: p.screenSize }),
    ...(p.conditionGrade !== undefined && { conditionGrade: p.conditionGrade }),
    ...(p.conditionGuarantees !== undefined && { conditionGuarantees: p.conditionGuarantees }),
    ...(p.knownDefects !== undefined && { knownDefects: p.knownDefects }),
    ...(p.priceOre !== undefined && { priceOre: p.priceOre }),
    ...(p.quantity !== undefined && { quantity: p.quantity }),
    ...(p.fulfillmentExpectations !== undefined && {
      fulfillmentExpectations: p.fulfillmentExpectations,
    }),
  };
}

export function registerListingsRoutes(app: FastifyInstance, listings: ListingsService): void {
  app.post('/listings', async (request, reply) => {
    const fields = parseOrThrow(createListingDraftRequestSchema, request.body);
    const listing = await listings.createListingDraft({
      organizationId: resolveOrganizationId(request),
      fields,
    });
    return reply.status(201).send(toListingResponse(listing));
  });

  app.patch('/listings/:id', async (request, reply) => {
    const { id } = parseOrThrow(idParamsSchema, request.params);
    const fields = parseOrThrow(updateListingDraftRequestSchema, request.body);
    const listing = await listings.updateListingDraft({
      listingId: id,
      organizationId: resolveOrganizationId(request),
      fields,
    });
    return reply.send(toListingResponse(listing));
  });

  app.post('/listings/:id/publish', async (request, reply) => {
    const { id } = parseOrThrow(idParamsSchema, request.params);
    const listing = await listings.publishListing({
      listingId: id,
      organizationId: resolveOrganizationId(request),
    });
    return reply.send(toListingResponse(listing));
  });

  app.post('/listings/:id/archive', async (request, reply) => {
    const { id } = parseOrThrow(idParamsSchema, request.params);
    const listing = await listings.archiveListing({
      listingId: id,
      organizationId: resolveOrganizationId(request),
    });
    return reply.send(toListingResponse(listing));
  });

  // Buyer discovery: only active listings are browsable (UC-001 B1).
  app.get('/listings', async (request, reply) => {
    const { search } = parseOrThrow(browseListingsQuerySchema, request.query);
    const result = await listings.browseActiveListings(search);
    return reply.send({ listings: result.map(toListingResponse) });
  });

  app.get('/listings/:id', async (request, reply) => {
    const { id } = parseOrThrow(idParamsSchema, request.params);
    const listing = await listings.getListing(id);
    return reply.send(toListingResponse(listing));
  });
}
