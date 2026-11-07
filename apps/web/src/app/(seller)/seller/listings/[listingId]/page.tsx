import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '../../../../../components/layout/container.tsx';
import { getSellerListing } from '../../../../../data/server/seller-listings.ts';
import {
  ArchiveListingButton,
  LISTING_NOTICES,
  ListingEditor,
  PublishedListingView,
  ReadOnlyDraftView,
  archiveListingAction,
  isListingNotice,
  publishListingAction,
  saveListingDraftAction,
} from '../../../../../features/seller-listings/index.ts';
import {
  DeactivationBanner,
  StaffNotice,
} from '../../../../../features/seller-organization/index.ts';
import { resolveSellerAccess } from '../../_lib/seller-access.ts';

export const metadata: Metadata = { title: 'Listing' };

/**
 * One listing at one URL (UC-007, UC-008, UC-009): a draft opens in the editor for owners and
 * managers, everything else read-only. Branching only; every state is rendered by the feature's
 * synchronous components (ADR-013).
 */
const Page = async ({
  params,
  searchParams,
}: {
  readonly params: Promise<{ listingId: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { listingId } = await params;
  const access = await resolveSellerAccess(`/seller/listings/${listingId}`);
  if (access.kind === 'staff') {
    return (
      <Container width="narrow" className="py-16">
        <StaffNotice />
      </Container>
    );
  }

  const listing = await getSellerListing(listingId, access.membership.organizationId);
  if (listing === null) {
    notFound();
  }

  const rawNotice = (await searchParams)['notice'];
  const notice = isListingNotice(rawNotice) ? LISTING_NOTICES[rawNotice] : undefined;
  const deactivated = access.membership.organizationStatus === 'deactivated';

  let body;
  if (listing.status !== 'draft') {
    body = (
      <PublishedListingView
        listing={listing}
        notice={notice}
        archive={
          access.canWrite && listing.status === 'active' ? (
            <ArchiveListingButton action={archiveListingAction.bind(null, listing.id)} />
          ) : undefined
        }
      />
    );
  } else if (access.canWrite) {
    body = (
      <div className="flex flex-col gap-6">
        <h1
          className={
            listing.title === null ? 'text-2xl font-semibold italic' : 'text-2xl font-semibold'
          }
        >
          {listing.title ?? 'Untitled draft'}
        </h1>
        <ListingEditor
          draft={listing}
          saveAction={saveListingDraftAction.bind(null, listing.id)}
          publishAction={publishListingAction.bind(null, listing.id)}
          initialNotice={notice?.text}
        />
      </div>
    );
  } else {
    body = <ReadOnlyDraftView draft={listing} />;
  }

  return (
    <Container className="flex flex-col gap-6 pt-8 pb-16">
      {deactivated ? <DeactivationBanner /> : null}
      {body}
    </Container>
  );
};

export default Page;
