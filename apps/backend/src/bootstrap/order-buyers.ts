import type { IdentityModuleApi } from '../modules/identity/identity.api.ts';
import type { OrderBuyers } from '../modules/orders/application/ports.ts';

/**
 * Adapts the identity module's user directory to the port the orders module declares, so an order
 * can name who placed it for the selling organization (P1-023) without the orders module importing
 * identity's internals. Display names only (spec D3). Same shape as `order-sellers.ts` (ADR-007).
 */
export const createOrderBuyers = (identity: IdentityModuleApi): OrderBuyers => ({
  displayNamesOf: (userIds) => identity.userDirectory.displayNamesOf(userIds),
});
