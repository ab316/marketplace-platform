import {
  OrganizationAccessDeniedError,
  OrganizationStateError,
  PlatformAdminRequiredError,
} from '../domain/errors.ts';
import type { Organization, OrganizationStatus } from '../domain/organization.ts';
import { type OrganizationRole, type Permission, permissionsForRole } from '../domain/roles.ts';
import type { User } from '../domain/user.ts';

/** The caller's membership of the single organization they belong to (PD-0003). */
export interface ActorMembership {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly organizationStatus: OrganizationStatus;
  readonly role: OrganizationRole;
  readonly permissions: readonly Permission[];
}

/**
 * Everything the rest of the backend needs to authorize a request, resolved fresh on every
 * request (ADR-008) so a revoked membership or role change takes effect immediately.
 */
export interface ActorContext {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly isPlatformAdmin: boolean;
  /** `null` for a buyer, who belongs to no organization. */
  readonly membership: ActorMembership | null;
}

export const buildActorContext = (user: User, organization: Organization | null): ActorContext => {
  const member = organization?.memberFor(user.id) ?? null;

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    isPlatformAdmin: user.isPlatformAdmin,
    membership:
      organization === null || member === null
        ? null
        : {
            organizationId: organization.id,
            organizationName: organization.name,
            organizationStatus: organization.status,
            role: member.role,
            permissions: permissionsForRole(member.role),
          },
  };
};

export const hasPermission = (actor: ActorContext, permission: Permission): boolean =>
  actor.membership?.permissions.includes(permission) ?? false;

/**
 * Which organizations the caller may read.
 *
 * Admin access is modelled as a wider scope rather than as a skipped check, so every query runs
 * through one code path and a missing `isPlatformAdmin` branch cannot silently expose another
 * organization's data.
 */
export interface OrganizationScope {
  /** `null` means every organization — platform staff only. */
  readonly organizationIds: readonly string[] | null;
}

export const readScopeFor = (actor: ActorContext): OrganizationScope =>
  actor.isPlatformAdmin
    ? { organizationIds: null }
    : { organizationIds: actor.membership === null ? [] : [actor.membership.organizationId] };

export const scopeAllows = (scope: OrganizationScope, organizationId: string): boolean =>
  scope.organizationIds === null || scope.organizationIds.includes(organizationId);

/** Throws unless the caller may read the organization, either as a member or as platform staff. */
export const assertCanReadOrganization = (actor: ActorContext, organizationId: string): void => {
  if (!scopeAllows(readScopeFor(actor), organizationId)) {
    throw new OrganizationAccessDeniedError();
  }
};

const WRITE_PERMISSIONS = new Set<Permission>([
  'listings:write',
  'organization:write',
  'members:write',
]);

export const isWritePermission = (permission: Permission): boolean =>
  WRITE_PERMISSIONS.has(permission);

/**
 * Throws unless the caller holds the permission *inside that organization*.
 *
 * Platform admins are deliberately excluded: staff oversee the marketplace, they do not act as
 * sellers (UC-003 E7). A deactivated organization accepts no writes, which is what freezes a
 * retired seller without deleting anything (UC-003 E6).
 */
export const assertMemberPermission = (
  actor: ActorContext,
  organizationId: string,
  permission: Permission
): void => {
  const membership = actor.membership;
  if (
    membership === null ||
    membership.organizationId !== organizationId ||
    !membership.permissions.includes(permission)
  ) {
    throw new OrganizationAccessDeniedError();
  }

  if (isWritePermission(permission) && membership.organizationStatus !== 'active') {
    throw new OrganizationStateError(
      'This organization is deactivated and cannot be changed. Contact marketplace staff.',
      { organizationId }
    );
  }
};

export const assertPlatformAdmin = (actor: ActorContext): void => {
  if (!actor.isPlatformAdmin) {
    throw new PlatformAdminRequiredError();
  }
};
