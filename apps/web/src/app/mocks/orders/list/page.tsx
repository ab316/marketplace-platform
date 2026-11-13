import type { Metadata } from 'next';

import { OrdersListMock } from '../../../../features/order-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · the buyer’s orders',
  description: 'UC-014: the plain /orders list (D7), 12 per page, and its empty state.',
};

const Page = () => <OrdersListMock />;

export default Page;
