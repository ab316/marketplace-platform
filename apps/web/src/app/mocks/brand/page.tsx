import type { Metadata } from 'next';

import { BrandBoard } from '../../../features/home-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · brand and logo',
  description: 'Four logo directions for Acme Tech, shown at header, favicon and poster size.',
  robots: { index: false, follow: false },
};

const Page = () => <BrandBoard />;

export default Page;
