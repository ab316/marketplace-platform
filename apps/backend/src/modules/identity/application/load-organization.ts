import { OrganizationNotFoundError } from '../domain/errors.ts';
import type { Organization } from '../domain/organization.ts';
import type { Permission } from '../domain/roles.ts';
import {
  type ActorContext,
  assertCanReadOrganization,
  assertMemberPermission,
} from './actor-context.ts';
import type { OrganizationRepository } from './ports.ts';

/**
 * Loads an organization the caller may act on as a member.
 *
 * The permission check runs before the lookup on purpose: a non-member gets the same `forbidden`
 * answer whether or not the organization exists, so the endpoint cannot be used to discover
 * which organization ids are real.
 */
export const loadOrganizationForMember = async (
  organizations: OrganizationRepository,
  organizationId: string,
  actor: ActorContext,
  permission: Permission
): Promise<Organization> => {
  assertMemberPermission(actor, organizationId, permission);
  return mustFind(organizations, organizationId);
};

/** Loads an organization the caller may read — as a member, or as platform staff. */
export const loadOrganizationForReader = async (
  organizations: OrganizationRepository,
  organizationId: string,
  actor: ActorContext
): Promise<Organization> => {
  assertCanReadOrganization(actor, organizationId);
  return mustFind(organizations, organizationId);
};

const mustFind = async (
  organizations: OrganizationRepository,
  organizationId: string
): Promise<Organization> => {
  const organization = await organizations.findById(organizationId);
  if (organization === null) {
    throw new OrganizationNotFoundError(organizationId);
  }
  return organization;
};
