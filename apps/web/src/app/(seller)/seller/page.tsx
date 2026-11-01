import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Container } from '../../../components/layout/container.tsx';
import { getCurrentActor } from '../../../data/server/current-actor.ts';
import { getOrganization } from '../../../data/server/organization.ts';
import {
  OrganizationSummary,
  SellerNextSteps,
  StaffNotice,
} from '../../../features/seller-organization/index.ts';

export const metadata: Metadata = {
  title: 'Your organization',
  description: 'Your seller organization on Acme Tech.',
};

/**
 * The seller home (UC-003; design `docs/design/seller-organization-setup.md`). Deliberately
 * small in this slice; later slices (members, listings, orders needing attention — P0-015) grow
 * it rather than adding new landing pages. Thin async shell per ADR-013.
 */
const Page = async () => {
  const actor = await getCurrentActor();
  if (actor === null) {
    redirect('/sign-in?next=/seller');
  }
  if (actor.isPlatformAdmin) {
    return (
      <Container width="narrow" className="py-16 sm:py-20">
        <StaffNotice />
      </Container>
    );
  }
  if (actor.membership === null) {
    // One place to create, no empty dashboard to explain.
    redirect('/seller/setup');
  }

  const organization = await getOrganization(actor.membership.organizationId);

  return (
    <Container width="narrow" className="flex flex-col gap-10 py-16 sm:py-20">
      <h1 className="sr-only">{organization.name}</h1>
      <OrganizationSummary organization={organization} role={actor.membership.role} />
      {organization.status === 'active' ? <SellerNextSteps /> : null}
    </Container>
  );
};

export default Page;
