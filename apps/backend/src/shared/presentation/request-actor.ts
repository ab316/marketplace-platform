import type { FastifyRequest } from 'fastify';

import { type Actor, findActor } from './actors.ts';
import { AuthenticationRequiredError, SellerPermissionError } from './errors.ts';

export const ACTOR_HEADER = 'x-actor-id';

/** A seller actor is guaranteed to belong to an organization. */
export interface SellerActorContext extends Actor {
  readonly organizationId: string;
}

const readActorHeader = (request: FastifyRequest): string | null => {
  const raw = request.headers[ACTOR_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === undefined || value.trim() === '' ? null : value.trim();
};

/** Resolves the caller when one is supplied; anonymous browsing stays allowed. */
export const getOptionalActor = (request: FastifyRequest): Actor | null => {
  const userId = readActorHeader(request);
  return userId === null ? null : findActor(userId);
};

export const requireActor = (request: FastifyRequest): Actor => {
  const userId = readActorHeader(request);
  const actor = userId === null ? null : findActor(userId);
  if (actor === null) {
    throw new AuthenticationRequiredError();
  }
  return actor;
};

export const requireSellerActor = (request: FastifyRequest): SellerActorContext => {
  const actor = requireActor(request);
  if (actor.organizationId === null || !actor.canManageListings) {
    throw new SellerPermissionError();
  }
  return { ...actor, organizationId: actor.organizationId };
};
