import type { Metadata } from 'next';

import { AuthMockSwitcher, AuthStatesBoard } from '../../../../features/auth-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · auth form states',
  description:
    'Every sign-in and sign-up state from UC-002 — validation, generic failure, rate limit, pending — side by side.',
};

const Page = () => (
  <>
    <AuthMockSwitcher current="/mocks/auth/states" />
    <AuthStatesBoard />
  </>
);

export default Page;
