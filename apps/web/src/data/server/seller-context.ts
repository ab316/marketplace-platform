import 'server-only';
import type { CurrentUser, Membership } from '@acme/api-contracts';
import { redirect } from 'next/navigation';

import { canWriteListings } from '../../features/seller-listings/access.ts';
import { getCurrentActor } from './current-actor.ts';

/**
 * The branching every `/seller/*` page shares (design contract, "Shared across all four
 * routes"), so each page shell stays a few lines (ADR-013):
 *
 * - anonymous or dead session → sign-in with `next` preserved (proxy.ts covers the cookie-less
 *   case; this covers a present-but-invalid one);
 * - platform staff → the page renders the staff notice (UC-003 E7);
 * - signed in, no organization → `/seller/setup`, the one place to create one.
 *
 * UX only: the backend re-checks role, membership, and organization status on every call
 * (ADR-011 §4).
 */
export type SellerContext =
  | { readonly kind: 'staff' }
  | {
      readonly kind: 'member';
      readonly actor: CurrentUser;
      readonly membership: Membership;
      readonly canWrite: boolean;
    };

export const getSellerContext = async (nextPath: string): Promise<SellerContext> => {
  const actor = await getCurrentActor();
  if (actor === null) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }
  if (actor.isPlatformAdmin) {
    return { kind: 'staff' };
  }
  if (actor.membership === null) {
    redirect('/seller/setup');
  }
  return {
    kind: 'member',
    actor,
    membership: actor.membership,
    canWrite: canWriteListings(actor),
  };
};
