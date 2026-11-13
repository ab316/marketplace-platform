import type { Metadata } from 'next';

import { ConfirmDialogMock } from '../../../../../features/order-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · order confirmation — in place',
  description:
    'Ordering spec D2: the confirmation as a dialog over the listing, keeping the laptop in view.',
};

const Page = () => <ConfirmDialogMock />;

export default Page;
