import type { FastifyInstance } from 'fastify';

import type { App } from '../bootstrap/compose-app.ts';
import { registerAuthRoutes } from '../modules/identity/presentation/auth-routes.ts';
import { registerOrganizationRoutes } from '../modules/identity/presentation/organization-routes.ts';
import { registerLedgerRoutes } from '../modules/ledger/presentation/ledger-routes.ts';
import { registerListingRoutes } from '../modules/listings/presentation/listing-routes.ts';
import { registerOrderRoutes } from '../modules/orders/presentation/order-routes.ts';
import { registerPaymentRoutes } from '../modules/payments/presentation/payment-routes.ts';
import { registerActorResolution } from '../shared/presentation/request-actor.ts';

/** Single place where every module's HTTP surface is mounted. */
export const registerRoutes = async (fastify: FastifyInstance, app: App): Promise<void> => {
  fastify.get('/health', () => ({ status: 'ok' }));

  // Must run before any route handler: it turns the bearer token into `request.actor`, which
  // every authorization check below reads (ADR-008).
  registerActorResolution(fastify, app.identity);

  registerAuthRoutes(fastify, app.identity);
  registerOrganizationRoutes(fastify, app.identity);
  registerListingRoutes(fastify, app.listings);
  registerOrderRoutes(fastify, app.orders);
  registerLedgerRoutes(fastify, app.ledger);
  await registerPaymentRoutes(fastify, app.payments.api, app.payments.callbackDecoder);
};
