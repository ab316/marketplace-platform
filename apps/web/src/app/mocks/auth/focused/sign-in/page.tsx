import type { Metadata } from 'next';

import { AuthMockSwitcher, FocusedSignIn } from '../../../../../features/auth-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · focused sign-in',
  description: 'Auth direction A: one centered card, sign-in as a five-second chore.',
};

const Page = () => (
  <>
    <AuthMockSwitcher current="/mocks/auth/focused/sign-in" />
    <FocusedSignIn />
  </>
);

export default Page;
