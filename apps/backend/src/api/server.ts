import Fastify, { type FastifyInstance } from 'fastify';

import type { App } from '../bootstrap/compose-app.ts';
import { registerListingsRoutes } from '../modules/listings/presentation/listings-routes.ts';
import { registerOrdersRoutes } from '../modules/orders/presentation/orders-routes.ts';
import { appErrorHandler } from '../shared/presentation/http.ts';

export function buildServer(app: App): FastifyInstance {
  const server = Fastify();

  server.setErrorHandler(appErrorHandler);

  server.get('/health', () => ({ status: 'ok' }));

  server.register(
    (api, _opts, done) => {
      registerListingsRoutes(api, app.listings);
      registerOrdersRoutes(api, app.orders);
      done();
    },
    { prefix: '/api/v1' }
  );

  return server;
}
