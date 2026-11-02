import type { CurrentUser } from '@acme/api-contracts';

/**
 * Whether the UI may offer listing write actions — create, edit, publish, archive — to this
 * actor. Computed once per page and passed down as a boolean so components never inspect the
 * actor (design contract, Interaction notes).
 *
 * Mirrors the backend rule it must never replace (ADR-011 §4): a member of the organization with
 * the `listings:write` permission, which owners and managers hold and viewers do not, inside an
 * organization that is still active (UC-003 E6). Platform staff never sell (UC-003 E7).
 */
export const canWriteListings = (actor: CurrentUser): boolean =>
  !actor.isPlatformAdmin &&
  actor.membership !== null &&
  actor.membership.organizationStatus === 'active' &&
  (actor.membership.role === 'owner' || actor.membership.role === 'manager');
