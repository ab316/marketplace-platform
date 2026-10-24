import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';

import type { App } from '../bootstrap/compose-app.ts';
import { registerErrorHandler } from '../shared/presentation/error-handler.ts';
import { registerRoutes } from './routes.ts';

/**
 * Builds the HTTP surface over an already composed application. Tests use this directly with
 * Fastify's request injection, so routes are exercised through the same wiring as production.
 */
export const createServer = async (app: App): Promise<FastifyInstance> => {
  const fastify = Fastify({
    logger: { level: app.config.logLevel },
    disableRequestLogging: app.config.nodeEnv === 'test',
  });

  await fastify.register(helmet);
  // UC-001 has no browser client yet; the web app will narrow this to its own origin.
  await fastify.register(cors, { origin: true });

  // Every injected test request shares one client address, so a shared budget would make
  // unrelated tests fail each other.
  if (app.config.nodeEnv !== 'test') {
    await fastify.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  }

  registerErrorHandler(fastify);
  registerRoutes(fastify, app);

  return fastify;
};
