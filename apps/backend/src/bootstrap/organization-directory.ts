import type { IdentityModuleApi } from '../modules/identity/identity.api.ts';
import type { OrganizationDirectory } from '../modules/listings/application/ports.ts';

/**
 * Adapts the identity module's public API to the port the listings module declares, so listings
 * can honour organization deactivation (UC-003 E6) without importing identity's internals.
 *
 * Same shape as `listing-reservations.ts`: the dependency is expressed as a port owned by the
 * consumer and satisfied here, in the composition root (ADR-007).
 */
export const createOrganizationDirectory = (
  identity: IdentityModuleApi
): OrganizationDirectory => ({
  deactivatedOrganizationIds: () => identity.organizationDirectory.deactivatedOrganizationIds(),
  isActive: (organizationId) => identity.organizationDirectory.isActive(organizationId),
});
