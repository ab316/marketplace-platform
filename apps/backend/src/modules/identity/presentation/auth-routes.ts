import {
  changePasswordRequestSchema,
  signInRequestSchema,
  signUpRequestSchema,
} from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import { requireActor } from '../../../shared/presentation/request-actor.ts';
import { parseRequest } from '../../../shared/presentation/validation.ts';
import type { IdentityModuleApi } from '../identity.api.ts';
import { toCurrentUser, toSessionResponse } from './identity-presenter.ts';

/**
 * Brute-force budget for credential endpoints (UC-002 E3). Far tighter than the global budget,
 * because guessing passwords is the attack these routes invite.
 */
const CREDENTIAL_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

export const registerAuthRoutes = (app: FastifyInstance, identity: IdentityModuleApi): void => {
  app.post('/api/auth/sign-up', CREDENTIAL_RATE_LIMIT, async (request, reply) => {
    const body = parseRequest(signUpRequestSchema, request.body, 'body');

    const actor = await identity.signUp.execute({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });

    request.log.info({ userId: actor.userId }, 'account created');
    return reply.status(201).send(toCurrentUser(actor));
  });

  app.post('/api/auth/sign-in', CREDENTIAL_RATE_LIMIT, async (request, reply) => {
    const body = parseRequest(signInRequestSchema, request.body, 'body');

    const result = await identity.signIn.execute({
      email: body.email,
      password: body.password,
    });

    request.log.info({ userId: result.actor.userId }, 'sign-in succeeded');
    return reply.status(200).send(toSessionResponse(result.token, result.expiresAt, result.actor));
  });

  app.post('/api/auth/sign-out', async (request, reply) => {
    // Resolving the actor first keeps the route honest about requiring a caller; the token itself
    // is read again below because only the raw value identifies the session to revoke.
    const actor = requireActor(request);
    const authorization = request.headers.authorization ?? '';
    const token = authorization.slice('Bearer '.length).trim();

    await identity.signOut.execute({ token });

    request.log.info({ userId: actor.userId }, 'sign-out');
    return reply.status(204).send();
  });

  app.get('/api/auth/me', async (request, reply) => {
    const actor = requireActor(request);
    return reply.status(200).send(toCurrentUser(actor));
  });

  app.post('/api/auth/password', CREDENTIAL_RATE_LIMIT, async (request, reply) => {
    const actor = requireActor(request);
    const body = parseRequest(changePasswordRequestSchema, request.body, 'body');

    await identity.changePassword.execute({
      userId: actor.userId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });

    // Every session is now revoked, including the one that made this request (UC-002 E5).
    request.log.info({ userId: actor.userId }, 'password changed; sessions revoked');
    return reply.status(204).send();
  });
};
