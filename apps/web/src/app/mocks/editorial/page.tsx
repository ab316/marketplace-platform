import type { Metadata } from 'next';

import { MockSwitcher, EditorialHome } from '../../../features/home-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · sustainability-led home page',
  description: 'Home-page direction B: impact and reassurance first, products as a shortlist.',
};

const Page = () => (
  <>
    <MockSwitcher current="/mocks/editorial" />
    <EditorialHome />
  </>
);

export default Page;
