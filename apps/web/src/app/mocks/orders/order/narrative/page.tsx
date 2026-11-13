import type { Metadata } from 'next';

import { OrderPageNarrativeMock } from '../../../../../features/order-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · order page — single column',
  description:
    'UC-014: the order page as one column — status, next step, timeline, then the snapshot.',
};

const Page = () => <OrderPageNarrativeMock />;

export default Page;
