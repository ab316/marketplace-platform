import type { Metadata } from 'next';

import { SellerListingsMock } from '../../../../features/seller-listings-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · seller listings — new listing form',
  description: 'UC-007 S1: the four-group form with every required disclosure.',
};

const Page = () => <SellerListingsMock state="form" />;

export default Page;
