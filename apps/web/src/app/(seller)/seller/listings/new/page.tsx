import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Container } from '../../../../../components/layout/container.tsx';
import { getSellerContext } from '../../../../../data/server/seller-context.ts';
import {
  ListingForm,
  SellerPageHeader,
  createListingAction,
  sellerListingsHref,
} from '../../../../../features/seller-listings/index.ts';
import { StaffNotice } from '../../../../../features/seller-organization/index.ts';

export const metadata: Metadata = {
  title: 'New listing',
  description: 'Create a listing draft for your seller organization.',
};

/**
 * Create a draft (UC-007 S1). A member who may not write — a viewer, or anyone in a deactivated
 * organization — is sent to the list, which shows why; the form is never rendered for someone the
 * backend would refuse (design contract, "Shared across all four routes").
 */
const Page = async () => {
  const context = await getSellerContext('/seller/listings/new');
  if (context.kind === 'staff') {
    return (
      <Container width="narrow" className="py-16 sm:py-20">
        <StaffNotice />
      </Container>
    );
  }
  if (!context.canWrite) {
    redirect(sellerListingsHref());
  }

  return (
    <Container width="narrow" className="flex flex-col gap-8 py-10">
      <SellerPageHeader
        eyebrow={`${context.membership.organizationName} · Listings`}
        title="New listing"
      />
      <ListingForm mode="new" cancelHref={sellerListingsHref()} action={createListingAction} />
    </Container>
  );
};

export default Page;
