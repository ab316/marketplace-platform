import type { Metadata } from 'next';

import { SellerListingsMock } from '../../../../features/seller-listings-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · seller listings — archive confirmation',
  description: 'UC-008 W2: the AlertDialog stating the consequences.',
};

const Page = () => <SellerListingsMock state="archive-dialog" />;

export default Page;
