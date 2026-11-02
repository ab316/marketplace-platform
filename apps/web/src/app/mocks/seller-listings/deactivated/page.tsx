import type { Metadata } from 'next';

import { SellerListingsMock } from '../../../../features/seller-listings-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · seller listings — deactivated organization',
  description: 'UC-003 E6: the list for a deactivated organization, no write affordances.',
};

const Page = () => <SellerListingsMock state="deactivated" />;

export default Page;
