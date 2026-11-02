import type { Metadata } from 'next';

import { SellerListingsMock } from '../../../../features/seller-listings-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · seller listings — no listings yet',
  description: 'UC-007: the empty state of a new organization pointing at the first draft.',
};

const Page = () => <SellerListingsMock state="list-empty" />;

export default Page;
