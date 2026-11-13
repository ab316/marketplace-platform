import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { getPublicListing } from '../../../../data/server/catalogue.ts';
import { getCurrentActor } from '../../../../data/server/current-actor.ts';
import { availabilityOf } from '../../../../features/listing-detail/index.ts';
import { OrderConfirmView, toOrderConfirmViewModel } from '../../../../features/orders/index.ts';

export const metadata: Metadata = { title: 'Confirm your order' };

type PageProps = { readonly params: Promise<{ listingId: string }> };

/**
 * The explicit confirmation step (UC-001 B3, spec D2; design: full-page direction). A thin async
 * shell per ADR-013.
 *
 * Everyone this page is not for is sent where their answer is: anonymous visitors to sign-in and
 * back to the listing (D5 — an intent from before sign-in is never replayed), ineligible viewers
 * and unavailable listings back to the listing page, which explains why (UC-012 A4). The backend
 * still decides everything at placement; this routing is UX, not authorization.
 */
const Page = async ({ params }: PageProps) => {
  const { listingId } = await params;
  const listingPath = `/listings/${encodeURIComponent(listingId)}`;

  const actor = await getCurrentActor();
  if (actor === null) {
    redirect(`/sign-in?next=${encodeURIComponent(listingPath)}`);
  }

  const listing = await getPublicListing(listingId);
  if (listing === null) {
    notFound();
  }

  const ineligible =
    actor.isPlatformAdmin || actor.membership?.organizationId === listing.seller.organizationId;
  if (ineligible || availabilityOf(listing).kind !== 'available') {
    redirect(listingPath);
  }

  return <OrderConfirmView listing={toOrderConfirmViewModel(listing)} />;
};

export default Page;
