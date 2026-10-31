import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentActor } from '../../data/server/current-actor.ts';
import { SignInForm, SplitAuthShell, signInAction } from '../../features/auth/index.ts';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Acme Tech account.',
};

/**
 * `proxy.ts` sends cookie-less visitors of protected pages here with `?next=<path>`; the action
 * returns them there after sign-in (sanitized server-side, so this page cannot open-redirect).
 */
const Page = async ({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  // Already signed in: this page has nothing to offer (UC-002 serves visitors).
  const actor = await getCurrentActor();
  if (actor !== null) {
    redirect('/');
  }

  const params = await searchParams;
  const next = typeof params['next'] === 'string' ? params['next'] : undefined;

  return (
    <SplitAuthShell
      variant="sign-in"
      title="Sign in"
      subtitle="Pick up where you left off — orders, listings, and your timeline."
    >
      <SignInForm action={signInAction} next={next} />
    </SplitAuthShell>
  );
};

export default Page;
