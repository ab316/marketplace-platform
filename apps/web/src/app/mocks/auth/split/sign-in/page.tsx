import type { Metadata } from 'next';

import { AuthMockSwitcher, SplitSignIn } from '../../../../../features/auth-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · split-panel sign-in',
  description: 'Auth direction B: the form beside a panel restating the escrow promise.',
};

const Page = () => (
  <>
    <AuthMockSwitcher current="/mocks/auth/split/sign-in" />
    <SplitSignIn />
  </>
);

export default Page;
