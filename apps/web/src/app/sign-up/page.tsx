import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentActor } from '../../data/server/current-actor.ts';
import { SignUpForm, SplitAuthShell, signUpAction } from '../../features/auth/index.ts';

export const metadata: Metadata = {
  title: 'Create your account',
  description:
    'One Acme Tech account for buying refurbished laptops — and for selling, once you set up an organization.',
};

const Page = async ({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const actor = await getCurrentActor();
  if (actor !== null) {
    redirect('/');
  }

  const params = await searchParams;
  const next = typeof params['next'] === 'string' ? params['next'] : undefined;

  return (
    <SplitAuthShell
      variant="sign-up"
      title="Create your account"
      subtitle="Takes a minute. No card, no commitment — just an email and a password."
    >
      <SignUpForm action={signUpAction} next={next} />
    </SplitAuthShell>
  );
};

export default Page;
