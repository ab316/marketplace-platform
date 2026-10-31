import type { Metadata } from 'next';

import { AuthMockSwitcher, SplitSignUp } from '../../../../../features/auth-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · split-panel sign-up',
  description:
    'Auth direction B: account creation beside the trust argument, including the seller path.',
};

const Page = () => (
  <>
    <AuthMockSwitcher current="/mocks/auth/split/sign-up" />
    <SplitSignUp />
  </>
);

export default Page;
