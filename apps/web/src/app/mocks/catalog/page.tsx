/// NOTE: This is placeholder file to fix an error given by claude-hfi while submitting the turn
import type { Metadata } from 'next';

import { EditorialHome } from '../../../features/home-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · sustainability-led home page',
  description: 'Home-page direction B: impact and reassurance first, products as a shortlist.',
};

const Page = () => <EditorialHome />;

export default Page;
