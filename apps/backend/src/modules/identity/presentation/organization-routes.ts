import {
  addMemberRequestSchema,
  changeMemberRoleRequestSchema,
  createOrganizationRequestSchema,
  listOrganizationsQuerySchema,
  organizationIdParamsSchema,
  organizationLifecycleRequestSchema,
  organizationMemberParamsSchema,
  updateOrganizationRequestSchema,
} from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import { requireActor, requirePlatformAdmin } from '../../../shared/presentation/request-actor.ts';
import { parseRequest } from '../../../shared/presentation/validation.ts';
import type { IdentityModuleApi } from '../identity.api.ts';
import {
  toAuditResponse,
  toMemberListResponse,
  toOrganizationListResponse,
  toOrganizationResponse,
} from './identity-presenter.ts';

/**
 * Organization and membership management (UC-003).
 *
 * Every route names its organization in the path and the application layer checks the caller's
 * membership against it, so belonging to one organization never grants access to another.
 */
export const registerOrganizationRoutes = (
  app: FastifyInstance,
  identity: IdentityModuleApi
): void => {
  // --- Seller organization ----------------------------------------------------------------

  app.post('/api/organizations', async (request, reply) => {
    const actor = requireActor(request);
    const body = parseRequest(createOrganizationRequestSchema, request.body, 'body');

    const view = await identity.createOrganization.execute({
      actorUserId: actor.userId,
      name: body.name,
      description: body.description,
    });

    request.log.info({ organizationId: view.id, userId: actor.userId }, 'organization created');
    return reply.status(201).send(toOrganizationResponse(view));
  });

  app.get('/api/organizations/:organizationId', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(organizationIdParamsSchema, request.params, 'params');

    const view = await identity.getOrganization.execute({
      actor,
      organizationId: params.organizationId,
    });

    return reply.status(200).send(toOrganizationResponse(view));
  });

  app.patch('/api/organizations/:organizationId', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(organizationIdParamsSchema, request.params, 'params');
    const body = parseRequest(updateOrganizationRequestSchema, request.body, 'body');

    const view = await identity.updateOrganizationProfile.execute({
      actor,
      organizationId: params.organizationId,
      name: body.name,
      description: body.description,
    });

    return reply.status(200).send(toOrganizationResponse(view));
  });

  // --- Members ----------------------------------------------------------------------------

  app.get('/api/organizations/:organizationId/members', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(organizationIdParamsSchema, request.params, 'params');

    const members = await identity.listOrganizationMembers.execute({
      actor,
      organizationId: params.organizationId,
    });

    return reply.status(200).send(toMemberListResponse(members));
  });

  app.post('/api/organizations/:organizationId/members', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(organizationIdParamsSchema, request.params, 'params');
    const body = parseRequest(addMemberRequestSchema, request.body, 'body');

    const members = await identity.addMember.execute({
      actor,
      organizationId: params.organizationId,
      email: body.email,
      role: body.role,
    });

    request.log.info(
      { organizationId: params.organizationId, actorUserId: actor.userId, role: body.role },
      'organization member added'
    );
    return reply.status(201).send(toMemberListResponse(members));
  });

  app.patch('/api/organizations/:organizationId/members/:userId', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(organizationMemberParamsSchema, request.params, 'params');
    const body = parseRequest(changeMemberRoleRequestSchema, request.body, 'body');

    const members = await identity.changeMemberRole.execute({
      actor,
      organizationId: params.organizationId,
      userId: params.userId,
      role: body.role,
    });

    request.log.info(
      {
        organizationId: params.organizationId,
        actorUserId: actor.userId,
        memberUserId: params.userId,
        role: body.role,
      },
      'organization member role changed'
    );
    return reply.status(200).send(toMemberListResponse(members));
  });

  app.delete('/api/organizations/:organizationId/members/:userId', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(organizationMemberParamsSchema, request.params, 'params');

    const members = await identity.removeMember.execute({
      actor,
      organizationId: params.organizationId,
      userId: params.userId,
    });

    request.log.info(
      {
        organizationId: params.organizationId,
        actorUserId: actor.userId,
        memberUserId: params.userId,
      },
      'organization member removed'
    );
    return reply.status(200).send(toMemberListResponse(members));
  });

  app.get('/api/organizations/:organizationId/audit', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(organizationIdParamsSchema, request.params, 'params');

    const entries = await identity.getOrganizationAudit.execute({
      actor,
      organizationId: params.organizationId,
    });

    return reply.status(200).send(toAuditResponse(entries));
  });

  // --- Marketplace staff oversight (UC-003 A1, A3) -----------------------------------------

  app.get('/api/admin/organizations', async (request, reply) => {
    const actor = requirePlatformAdmin(request);
    const query = parseRequest(listOrganizationsQuerySchema, request.query, 'query');

    const page = await identity.listOrganizations.execute({
      actor,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.status(200).send(toOrganizationListResponse(page));
  });

  app.post('/api/admin/organizations/:organizationId/deactivate', async (request, reply) => {
    const actor = requirePlatformAdmin(request);
    const params = parseRequest(organizationIdParamsSchema, request.params, 'params');
    const body = parseRequest(organizationLifecycleRequestSchema, request.body, 'body');

    const view = await identity.deactivateOrganization.execute({
      actor,
      organizationId: params.organizationId,
      reason: body.reason,
    });

    request.log.warn(
      { organizationId: params.organizationId, actorUserId: actor.userId },
      'organization deactivated'
    );
    return reply.status(200).send(toOrganizationResponse(view));
  });

  app.post('/api/admin/organizations/:organizationId/reactivate', async (request, reply) => {
    const actor = requirePlatformAdmin(request);
    const params = parseRequest(organizationIdParamsSchema, request.params, 'params');
    const body = parseRequest(organizationLifecycleRequestSchema, request.body, 'body');

    const view = await identity.reactivateOrganization.execute({
      actor,
      organizationId: params.organizationId,
      reason: body.reason,
    });

    request.log.warn(
      { organizationId: params.organizationId, actorUserId: actor.userId },
      'organization reactivated'
    );
    return reply.status(200).send(toOrganizationResponse(view));
  });
};
