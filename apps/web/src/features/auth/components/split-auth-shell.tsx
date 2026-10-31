import { BadgeCheck, History, ShieldCheck, Store } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo } from '../../../components/brand/logo.tsx';

/**
 * The split-panel layout chosen from the mockup round (docs/design/auth-pages.md): the form beside
 * a panel restating what the account is for. On a trust-centered marketplace, creating an account
 * is part of deciding to trust the platform, so half the page re-earns that trust at exactly the
 * moment it is being weighed.
 *
 * A Server Component — only the forms inside it are interactive.
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

export const SplitAuthShell = ({
  variant,
  title,
  subtitle,
  children,
}: {
  readonly variant: 'sign-in' | 'sign-up';
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
}) => {
  const headline =
    variant === 'sign-in'
      ? 'Buy refurbished with your money protected.'
      : 'One account, whether you buy or sell.';
  const points = variant === 'sign-in' ? SHARED_POINTS : [...SHARED_POINTS, SELLER_POINT];

  return (
    <section className="grid flex-1 lg:grid-cols-2">
      {/* The trust panel. Full points would bury the form on small screens, so on mobile it
          collapses to the headline; the points appear from `lg` up. */}
      <div className="border-border from-accent/50 border-b bg-gradient-to-br to-transparent lg:border-r lg:border-b-0">
        <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center gap-8 px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
          <Link href="/" aria-label="Acme Tech home" className="self-start">
            <Logo size="sm" />
          </Link>

          <p className="text-3xl font-semibold tracking-tight text-balance lg:text-4xl">
            {headline}
          </p>

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
};
