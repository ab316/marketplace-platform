import type { Metadata } from 'next';

import { MockSwitcher, OriginalHome } from '../../../features/home-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · original scaffold home page',
  description: 'The home page the Next.js foundation shipped with, kept as a reference point.',
};

const Page = () => (
  <>
    <MockSwitcher current="/mocks/original" />
    <OriginalHome />
  </>
);

export default Page;
