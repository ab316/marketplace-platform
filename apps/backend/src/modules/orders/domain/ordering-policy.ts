import { OrderNotAllowedError } from './errors.ts';

/**
 * Who is trying to order, as far as eligibility is concerned (buyer ordering spec D3, P1-021):
 * their single organization membership, if any, and whether they are marketplace staff.
 */
export interface OrderingBuyer {
  readonly userId: string;
  readonly organizationId: string | null;
  readonly isPlatformAdmin: boolean;
}

/**
 * Who may place an order (UC-001 rules, spec D3): any signed-in user, except marketplace staff —
 * who never transact — and except a member of the selling organization in any role, because that
 * is not a real purchase and would corrupt the marketplace's own order and fee data. A member of a
 * *different* organization buys like anyone else.
 *
 * Pass `null` as `sellerOrganizationId` when the seller is not known yet: the staff rule needs no
 * seller, so it is enforced before any lookup or reservation happens.
 */
export const assertMayPlaceOrder = (
  buyer: OrderingBuyer,
  sellerOrganizationId: string | null
): void => {
  if (buyer.isPlatformAdmin) {
    throw new OrderNotAllowedError('Marketplace staff do not place orders.', {
      reason: 'platform_staff',
    });
  }

  if (sellerOrganizationId !== null && buyer.organizationId === sellerOrganizationId) {
    throw new OrderNotAllowedError("You cannot order your own organization's listing.", {
      reason: 'own_organization',
      sellerOrganizationId,
    });
  }
};
