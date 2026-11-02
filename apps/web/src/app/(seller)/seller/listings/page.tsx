import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../../../components/layout/container.tsx';
import { Button } from '../../../../components/ui/button.tsx';
import { getSellerContext } from '../../../../data/server/seller-context.ts';
import { listSellerListings } from '../../../../data/server/seller-listings.ts';
import {
  ListingTable,
  SellerPageHeader,
  newListingHref,
  parseListingsPage,
} from '../../../../features/seller-listings/index.ts';
import { DeactivationBanner, StaffNotice } from '../../../../features/seller-organization/index.ts';

export const metadata: Metadata = {
  title: 'Your listings',
  description: 'Every listing of your seller organization: drafts, published, and archived.',
};

/**
 * The organization's listing list (UC-007 S5; design `docs/design/seller-listing-management.md`).
 * Thin async shell per ADR-013: resolve the seller context, parse the page, fetch, render.
 */
const Page = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const context = await getSellerContext('/seller/listings');
  if (context.kind === 'staff') {
    return (
      <Container width="narrow" className="py-16 sm:py-20">
        <StaffNotice />
      </Container>
    );
  }

  const currentPage = parseListingsPage((await searchParams)['page']);
  const page = await listSellerListings(currentPage);
  const { membership, canWrite } = context;

  return (
    <Container className="flex flex-col gap-6 py-10">
      {membership.organizationStatus === 'deactivated' ? <DeactivationBanner /> : null}
      <SellerPageHeader
        eyebrow={membership.organizationName}
        title="Your listings"
        action={
          canWrite && page.total > 0 ? (
            <Button asChild>
              <Link href={newListingHref()}>
                <Plus aria-hidden="true" /> New listing
              </Link>
            </Button>
          ) : undefined
        }
      />
      <ListingTable
        page={page}
        currentPage={currentPage}
        canWrite={canWrite}
        organizationName={membership.organizationName}
      />
    </Container>
  );
};

export default Page;
