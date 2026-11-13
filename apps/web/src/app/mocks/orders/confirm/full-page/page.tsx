import type { Metadata } from 'next';

import { ConfirmPageMock } from '../../../../../features/order-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · order confirmation — own page',
  description:
    'Ordering spec D2: the confirmation as a dedicated page, shaped like a checkout review step.',
};

const Page = () => <ConfirmPageMock />;

export default Page;
