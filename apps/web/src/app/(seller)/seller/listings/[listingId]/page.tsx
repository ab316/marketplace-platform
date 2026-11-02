import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '../../../../../components/layout/container.tsx';
import { ApiError } from '../../../../../data/api-error.ts';
import { getSellerContext } from '../../../../../data/server/seller-context.ts';
import { getSellerListing } from '../../../../../data/server/seller-listings.ts';
import {
  ListingDetail,
  SellerPageHeader,
  archiveListingAction,
  publishListingAction,
} from '../../../../../features/seller-listings/index.ts';
import {
  DeactivationBanner,
  StaffNotice,
} from '../../../../../features/seller-organization/index.ts';

export const metadata: Metadata = {
  title: 'Listing',
  description: 'A listing of your seller organization.',
};

type Params = Promise<{ listingId: string }>;

/**
 * The seller-facing listing detail (UC-007 S2–S4, UC-008). A listing the backend refuses (403) or
 * does not know (404), or one that belongs to another organization, renders not-found: to this
 * member it does not exist as something to manage.
 */
const Page = async ({ params }: { params: Promise<{ listingId: string }> & Params }) => {
  const { listingId } = await params;
  const context = await getSellerContext(`/seller/listings/${listingId}`);
  if (context.kind === 'staff') {
    return (
      <Container width="narrow" className="py-16 sm:py-20">
        <StaffNotice />
      </Container>
    );
  }

  const listing = await loadOwnListing(listingId, context.membership.organizationId);

  return (
    <Container className="flex flex-col gap-8 py-10">
      {context.membership.organizationStatus === 'deactivated' ? <DeactivationBanner /> : null}
      <SellerPageHeader
        eyebrow={`${context.membership.organizationName} · Listings`}
        title={listing.title}
        action={
          <span className="text-muted-foreground text-sm">
            {listing.specifications.brand} {listing.specifications.model}
          </span>
        }
      />
      <ListingDetail
        listing={listing}
        canWrite={context.canWrite}
        publishAction={publishListingAction}
        archiveAction={archiveListingAction}
      />
    </Container>
  );
};

const loadOwnListing = async (listingId: string, organizationId: string) => {
  try {
    const listing = await getSellerListing(listingId);
    if (listing.organizationId !== organizationId) {
      notFound();
    }
    return listing;
  } catch (error) {
    if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) {
      notFound();
    }
    throw error;
  }
};

export default Page;
