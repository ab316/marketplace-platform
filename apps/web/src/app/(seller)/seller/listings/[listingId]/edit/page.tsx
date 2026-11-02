import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { Container } from '../../../../../../components/layout/container.tsx';
import { ApiError } from '../../../../../../data/api-error.ts';
import { getSellerContext } from '../../../../../../data/server/seller-context.ts';
import { getSellerListing } from '../../../../../../data/server/seller-listings.ts';
import {
  ListingForm,
  SellerPageHeader,
  listingDetailHref,
  sellerListingsHref,
  toListingFormValues,
  updateListingAction,
} from '../../../../../../features/seller-listings/index.ts';
import { StaffNotice } from '../../../../../../features/seller-organization/index.ts';

export const metadata: Metadata = {
  title: 'Edit listing',
  description: 'Edit a listing draft of your seller organization.',
};

/**
 * Edit a draft (UC-007 S2, A1). Only drafts are editable (A2): a published or archived listing
 * sends the member to its detail page, which shows the status and says why. Members who may not
 * write go to the list.
 */
const Page = async ({ params }: { params: Promise<{ listingId: string }> }) => {
  const { listingId } = await params;
  const context = await getSellerContext(`/seller/listings/${listingId}/edit`);
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

  let listing;
  try {
    listing = await getSellerListing(listingId);
  } catch (error) {
    if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) {
      notFound();
    }
    throw error;
  }
  if (listing.organizationId !== context.membership.organizationId) {
    notFound();
  }
  if (listing.status !== 'draft') {
    redirect(listingDetailHref(listing.id));
  }

  return (
    <Container width="narrow" className="flex flex-col gap-8 py-10">
      <SellerPageHeader
        eyebrow={`${context.membership.organizationName} · Listings`}
        title={`Edit ${listing.title}`}
      />
      <ListingForm
        mode="edit"
        defaultValues={toListingFormValues(listing)}
        cancelHref={listingDetailHref(listing.id)}
        action={updateListingAction.bind(null, listing.id)}
      />
    </Container>
  );
};

export default Page;
