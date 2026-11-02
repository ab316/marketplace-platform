import type { Metadata } from 'next';

import { SellerListingsMock } from '../../../../features/seller-listings-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · seller listings — form with errors',
  description: 'UC-007 E1: field-level validation reasons with typed values preserved.',
};

const Page = () => <SellerListingsMock state="form-errors" />;

export default Page;
