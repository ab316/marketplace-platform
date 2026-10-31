import { BadgeCheck, History, ShieldCheck, Store } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '../../../components/brand/logo.tsx';
import { SignInFormMock, SignUpFormMock } from '../components/auth-forms.tsx';

/**
 * Direction B — the form beside a panel restating what the account is for. The closest reference
 * is shopify.com sign-up.
 *
 * The argument: on a trust-centered marketplace, creating an account is part of deciding to trust
 * the platform, not an interruption of it. A first-time buyer is about to hand money to an escrow
 * they have never used; a seller is about to put their business on it. Half the page re-earns that
 * trust at exactly the moment it is being weighed.
 *
 * The cost, stated honestly: a returning user gets a half-page of argument they already accepted,
 * and on small screens the panel pushes the form down.
 */

type TrustPoint = {
  readonly icon: typeof ShieldCheck;
  readonly title: string;
  readonly body: string;
};

const SHARED_POINTS: readonly TrustPoint[] = [
  {
    icon: ShieldCheck,
    title: 'Money moves only when you say so',
    body: 'Payment is held in escrow and released to the seller after you confirm delivery.',
  },
  {
    icon: BadgeCheck,
    title: 'Sellers are registered organizations',
    body: 'Every listing belongs to a verified Swedish organization with a visible track record.',
  },
  {
    icon: History,
    title: 'Every order keeps its history',
    body: 'Payment, fulfillment, and confirmation are recorded on a timeline you can always read.',
  },
];

const SELLER_POINT: TrustPoint = {
  icon: Store,
  title: 'Selling starts with this same account',
  body: 'Create your personal account, then register your organization and add your team.',
};

const SplitShell = ({
  headline,
  points,
  title,
  subtitle,
  children,
}: {
  readonly headline: string;
  readonly points: readonly TrustPoint[];
  readonly title: string;
  readonly subtitle: string;
  readonly children: React.ReactNode;
}) => (
  <section className="grid flex-1 lg:grid-cols-2">
    {/* The trust panel. Second in reading order on small screens would bury the form, so on
        mobile it collapses to the headline only; the full points appear from `lg` up. */}
    <div className="border-border from-accent/50 border-b bg-gradient-to-br to-transparent lg:border-r lg:border-b-0">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center gap-8 px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
        <Link href="/" aria-label="Acme Tech home" className="self-start">
          <Logo size="sm" />
        </Link>

        <p className="text-3xl font-semibold tracking-tight text-balance lg:text-4xl">{headline}</p>

        <ul className="hidden flex-col gap-6 lg:flex">
          {points.map((point) => (
            <li key={point.title} className="flex items-start gap-3">
              <point.icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">{point.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{point.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="flex items-center">
      <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  </section>
);

export const SplitSignIn = () => (
  <SplitShell
    headline="Buy refurbished with your money protected."
    points={SHARED_POINTS}
    title="Sign in"
    subtitle="Pick up where you left off — orders, listings, and your timeline."
  >
    <SignInFormMock signUpHref="/mocks/auth/split/sign-up" />
  </SplitShell>
);

export const SplitSignUp = () => (
  <SplitShell
    headline="One account, whether you buy or sell."
    points={[...SHARED_POINTS, SELLER_POINT]}
    title="Create your account"
    subtitle="Takes a minute. No card, no commitment — just an email and a password."
  >
    <SignUpFormMock signInHref="/mocks/auth/split/sign-in" />
  </SplitShell>
);
