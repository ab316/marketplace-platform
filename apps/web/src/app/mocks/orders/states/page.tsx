import type { Metadata } from 'next';

import { OrderStatesMock } from '../../../../features/order-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · order states',
  description:
    'UC-014: the four states the order page must render — awaiting payment, cancelled, expired, paid.',
};

const Page = () => <OrderStatesMock />;

export default Page;
