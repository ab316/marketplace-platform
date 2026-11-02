import type { Metadata } from 'next';

import { SellerListingsMock } from '../../../../features/seller-listings-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · seller listings — archived detail',
  description: 'UC-008 W4: a withdrawn listing with final counts and no actions.',
};

const Page = () => <SellerListingsMock state="detail-archived" />;

export default Page;
