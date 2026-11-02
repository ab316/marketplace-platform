import type { Metadata } from 'next';

import { SellerListingsMock } from '../../../../features/seller-listings-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · seller listings — draft detail',
  description: 'UC-007 S2/S3: a draft with Edit and Publish.',
};

const Page = () => <SellerListingsMock state="detail-draft" />;

export default Page;
