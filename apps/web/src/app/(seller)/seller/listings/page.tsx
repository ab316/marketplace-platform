import type { Metadata } from 'next';

import { Container } from '../../../../components/layout/container.tsx';
import {
  SELLER_LISTINGS_PAGE_SIZE,
  listSellerListings,
} from '../../../../data/server/seller-listings.ts';
import { SellerListingsView } from '../../../../features/seller-listings/index.ts';
import { DeactivationBanner, StaffNotice } from '../../../../features/seller-organization/index.ts';
import { resolveSellerAccess } from '../_lib/seller-access.ts';

export const metadata: Metadata = {
  title: 'Listings',
  description: "Your organization's listings on Acme Tech.",
};

const parsePage = (raw: string | string[] | undefined): number => {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isSafeInteger(value) && value >= 1 ? value : 1;
};

/**
 * The organization's listings (UC-010; design `docs/design/seller-listing-management.md`).
 * Thin async shell per ADR-013.
 */
const Page = async ({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const access = await resolveSellerAccess('/seller/listings');
  if (access.kind === 'staff') {
    return (
      <Container width="narrow" className="py-16">
        <StaffNotice />
      </Container>
    );
  }

  const pageNumber = parsePage((await searchParams)['page']);
  const page = await listSellerListings(pageNumber);

  return (
    <Container className="flex flex-col gap-6 pt-8 pb-16">
      {access.membership.organizationStatus === 'deactivated' ? <DeactivationBanner /> : null}
      <SellerListingsView
        page={page}
        pageNumber={pageNumber}
        pageSize={SELLER_LISTINGS_PAGE_SIZE}
        canWrite={access.canWrite}
      />
    </Container>
  );
};

export default Page;
