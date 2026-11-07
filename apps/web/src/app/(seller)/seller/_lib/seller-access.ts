import 'server-only';
import type { Membership } from '@acme/api-contracts';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentActor } from '../../../../data/server/current-actor.ts';

export type SellerAccess =
  | { readonly kind: 'staff' }
  | {
      readonly kind: 'member';
      readonly membership: Membership;
      /** Owner or manager of an active organization: may create, edit, publish, archive. */
      readonly canWrite: boolean;
    };

/**
 * Who is looking at a seller page, and what the page may offer them (design: "Shared by every
 * route"). UX only: the backend re-checks role, membership, and organization status on every
 * call (ADR-011 §4). Redirects anonymous visitors to sign-in and non-members to setup.
 */
export const resolveSellerAccess = async (path: string): Promise<SellerAccess> => {
  const actor = await getCurrentActor();
  if (actor === null) {
    redirect(`/sign-in?next=${encodeURIComponent(path)}` as Route);
  }
  if (actor.isPlatformAdmin) {
    return { kind: 'staff' };
  }
  if (actor.membership === null) {
    redirect('/seller/setup');
  }

  const { membership } = actor;
  return {
    kind: 'member',
    membership,
    canWrite: membership.role !== 'viewer' && membership.organizationStatus === 'active',
  };
};
