import type { IdentityModuleApi } from '../modules/identity/identity.api.ts';
import type { OrderSellers } from '../modules/orders/application/ports.ts';

/**
 * Adapts the identity module's organization directory to the port the orders module declares, so
 * an order can name the organization the buyer is buying from (P1-020) without the orders module
 * importing identity's internals.
 *
 * Same shape as `listing-reservations.ts` and `organization-directory.ts`: the dependency is
 * expressed as a port owned by the consumer and satisfied here, in the composition root (ADR-007).
 */
export const createOrderSellers = (identity: IdentityModuleApi): OrderSellers => ({
  namesOf: async (organizationIds) => {
    const summaries = await identity.organizationDirectory.findMany(organizationIds);
    return new Map(summaries.map((summary) => [summary.id, summary.name]));
  },
});
