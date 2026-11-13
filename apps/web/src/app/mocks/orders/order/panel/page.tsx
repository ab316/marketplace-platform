import type { Metadata } from 'next';

import { OrderPagePanelMock } from '../../../../../features/order-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · order page — status panel',
  description: 'UC-014: the order page with a sticky status card beside the snapshot and timeline.',
};

const Page = () => <OrderPagePanelMock />;

export default Page;
