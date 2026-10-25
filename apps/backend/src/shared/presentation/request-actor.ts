import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  type ActorContext,
  assertMemberPermission,
  assertPlatformAdmin,
} from '../../modules/identity/application/actor-context.ts';
import type { Permission } from '../../modules/identity/domain/roles.ts';
import type { IdentityModuleApi } from '../../modules/identity/identity.api.ts';
import { AuthenticationRequiredError, OrganizationRequiredError } from './errors.ts';

declare module 'fastify' {
  interface FastifyRequest {
    /** Resolved once per request by `registerActorResolution`; `null` when anonymous. */
    actor: ActorContext | null;
  }
}

const BEARER_PREFIX = 'bearer ';

const readBearerToken = (request: FastifyRequest): string | null => {
  const raw = request.headers.authorization;
  if (raw === undefined || !raw.toLowerCase().startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = raw.slice(BEARER_PREFIX.length).trim();
  return token.length === 0 ? null : token;
};

/**
 * Resolves the caller once per request (ADR-008).
 *
 * Because membership and role are read from storage here rather than carried in the token, a
 * removed member, a changed role, or a deactivated organization takes effect on the very next
 * request. An unusable token simply leaves the request anonymous; routes that require a caller
 * reject it, and routes that allow browsing continue to work.
 */
export const registerActorResolution = (
  app: FastifyInstance,
  identity: IdentityModuleApi
): void => {
  app.decorateRequest('actor', null);

  app.addHook('onRequest', async (request) => {
    const token = readBearerToken(request);
    if (token === null) {
      return;
    }

    request.actor = await identity.resolveActorContext.execute({ token });
  });
};

/** Anonymous browsing stays allowed, so some routes only want the caller when there is one. */
export const getOptionalActor = (request: FastifyRequest): ActorContext | null => request.actor;

export const requireActor = (request: FastifyRequest): ActorContext => {
  if (request.actor === null) {
    throw new AuthenticationRequiredError();
  }
  return request.actor;
};

export interface MemberContext {
  readonly actor: ActorContext;
  readonly organizationId: string;
}

/**
 * Requires the caller to hold `permission` in the organization they belong to.
 *
 * Used by routes whose organization is implied by the caller's own membership. Routes that name
 * an organization in the path check it explicitly in the application layer instead, so a member
 * of one organization can never act on another's resources.
 */
export const requireMembership = (
  request: FastifyRequest,
  permission: Permission
): MemberContext => {
  const actor = requireActor(request);
  if (actor.membership === null) {
    throw new OrganizationRequiredError();
  }

  const organizationId = actor.membership.organizationId;
  assertMemberPermission(actor, organizationId, permission);
  return { actor, organizationId };
};

export const requirePlatformAdmin = (request: FastifyRequest): ActorContext => {
  const actor = requireActor(request);
  assertPlatformAdmin(actor);
  return actor;
};
