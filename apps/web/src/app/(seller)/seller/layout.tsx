import type { ReactNode } from 'react';

import { Container } from '../../../components/layout/container.tsx';
import { SellerNav } from '../../../components/layout/seller-nav.tsx';
import { getCurrentActor } from '../../../data/server/current-actor.ts';

/**
 * The seller area's shared chrome: the sub-navigation, for members only. Someone setting up an
 * organization, and marketplace staff, see no seller navigation. Pages still make their own
 * access decisions; `getCurrentActor` is deduplicated per request.
 */
const SellerLayout = async ({ children }: { readonly children: ReactNode }) => {
  const actor = await getCurrentActor();
  const isMember = actor !== null && !actor.isPlatformAdmin && actor.membership !== null;

  return (
    <>
      {isMember ? (
        <Container className="pt-6">
          <SellerNav />
        </Container>
      ) : null}
      {children}
    </>
  );
};

export default SellerLayout;
