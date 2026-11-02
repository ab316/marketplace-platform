import type { Metadata } from 'next';

import { SellerListingsMock } from '../../../../features/seller-listings-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · seller listings — listing list',
  description: 'UC-007 S5: every listing of the organization in one table, every status.',
};

const Page = () => <SellerListingsMock state="list" />;

export default Page;
