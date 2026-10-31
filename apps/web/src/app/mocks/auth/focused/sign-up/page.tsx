import type { Metadata } from 'next';

import { AuthMockSwitcher, FocusedSignUp } from '../../../../../features/auth-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · focused sign-up',
  description: 'Auth direction A: one centered card, account creation with no marketing panel.',
};

const Page = () => (
  <>
    <AuthMockSwitcher current="/mocks/auth/focused/sign-up" />
    <FocusedSignUp />
  </>
);

export default Page;
