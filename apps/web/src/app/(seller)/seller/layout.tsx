import type { ReactNode } from 'react';

import { getCurrentActor } from '../../../data/server/current-actor.ts';
import { SellerNav } from '../../../features/seller-listings/index.ts';

/**
 * The seller area. Members get the sub-navigation on every page; a visitor with no organization
 * (on `/seller/setup`) and platform staff (who see the staff notice) do not, so the nav never
 * points at pages the person cannot use. The actor read is deduplicated with the pages' own
 * read within the request (`getCurrentActor` is `cache()`d), so this costs no extra round-trip.
 */
const SellerLayout = async ({ children }: { children: ReactNode }) => {
  const actor = await getCurrentActor();
  const isMember = actor !== null && !actor.isPlatformAdmin && actor.membership !== null;

  return (
    <>
      {isMember ? <SellerNav /> : null}
      {children}
    </>
  );
};

export default SellerLayout;
