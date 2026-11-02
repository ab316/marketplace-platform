import type { Metadata } from 'next';

import { SellerListingsMock } from '../../../../features/seller-listings-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · seller listings — active detail',
  description: 'UC-007 S4: a published listing with stock counts and Archive.',
};

const Page = () => <SellerListingsMock state="detail-active" />;

export default Page;
