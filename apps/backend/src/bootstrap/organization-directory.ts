import type { OrganizationSummary } from '../modules/identity/application/ports.ts';
import type { IdentityModuleApi } from '../modules/identity/identity.api.ts';
import type {
  OrganizationDirectory,
  SellerOrganization,
} from '../modules/listings/application/ports.ts';

/**
 * Adapts the identity module's public API to the port the listings module declares, so listings
 * can honour organization deactivation (UC-003 E6) and name the seller a buyer is looking at
 * (UC-012) without importing identity's internals.
 *
 * Same shape as `listing-reservations.ts`: the dependency is expressed as a port owned by the
 * consumer and satisfied here, in the composition root (ADR-007).
 */
export const createOrganizationDirectory = (
  identity: IdentityModuleApi
): OrganizationDirectory => ({
  deactivatedOrganizationIds: () => identity.organizationDirectory.deactivatedOrganizationIds(),

  findSeller: async (organizationId) => {
    const summary = await identity.organizationDirectory.find(organizationId);
    return summary === null ? null : toSellerOrganization(summary);
  },

  findSellers: async (organizationIds) => {
    const summaries = await identity.organizationDirectory.findMany(organizationIds);
    return summaries.map(toSellerOrganization);
  },
});

const toSellerOrganization = (summary: OrganizationSummary): SellerOrganization => ({
  organizationId: summary.id,
  name: summary.name,
  isActive: summary.isActive,
});
