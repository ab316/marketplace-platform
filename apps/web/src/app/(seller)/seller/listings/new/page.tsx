import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Container } from '../../../../../components/layout/container.tsx';
import {
  ListingEditor,
  createListingDraftAction,
} from '../../../../../features/seller-listings/index.ts';
import { StaffNotice } from '../../../../../features/seller-organization/index.ts';
import { resolveSellerAccess } from '../../_lib/seller-access.ts';

export const metadata: Metadata = { title: 'New listing' };

/**
 * An empty draft form (UC-005). Nothing is created until the first save, so abandoned visits
 * leave no junk drafts behind (design: "Route & entry points"). Thin async shell per ADR-013.
 */
const Page = async () => {
  const access = await resolveSellerAccess('/seller/listings/new');
  if (access.kind === 'staff') {
    return (
      <Container width="narrow" className="py-16">
        <StaffNotice />
      </Container>
    );
  }
  if (!access.canWrite) {
    redirect('/seller/listings');
  }

  return (
    <Container className="flex flex-col gap-6 pt-8 pb-16">
      <h1 className="text-2xl font-semibold">New listing</h1>
      <ListingEditor createAction={createListingDraftAction} />
    </Container>
  );
};

export default Page;
