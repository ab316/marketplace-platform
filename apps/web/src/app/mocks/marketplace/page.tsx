import type { Metadata } from 'next';

import { MockSwitcher, MarketplaceHome } from '../../../features/home-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · commerce-first home page',
  description: 'Home-page direction A: search and inventory first, trust as a thin strip.',
};

const Page = () => (
  <>
    <MockSwitcher current="/mocks/marketplace" />
    <MarketplaceHome />
  </>
);

export default Page;
