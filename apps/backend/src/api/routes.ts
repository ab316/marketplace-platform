import type { FastifyInstance } from 'fastify';

import type { App } from '../bootstrap/compose-app.ts';
import { registerListingRoutes } from '../modules/listings/presentation/listing-routes.ts';
import { registerOrderRoutes } from '../modules/orders/presentation/order-routes.ts';

/** Single place where every module's HTTP surface is mounted. */
export const registerRoutes = (fastify: FastifyInstance, app: App): void => {
  fastify.get('/health', () => ({ status: 'ok' }));

  registerListingRoutes(fastify, app.listings);
  registerOrderRoutes(fastify, app.orders);
};
