import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '../../../components/brand/logo.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';
import { SignInFormMock, SignUpFormMock } from '../components/auth-forms.tsx';

/**
 * Direction A — one centered card and nothing else. The closest reference is backmarket.com.
 *
 * The argument: authentication is a chore, not a conversion moment. The person on this page
 * already decided to be here — they came from a listing, an order email, or the header — so the
 * page's only job is to get them through in five seconds. No marketing panel, no imagery, just
 * the brand mark (so the page is recognizably ours), the form, and one line of reassurance.
 *
 * The cost, stated honestly: the sign-up page does none of the trust-building work, which matters
 * if visitors arrive at sign-up *before* being convinced by a listing.
 */

const FocusedShell = ({
  title,
  subtitle,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly children: React.ReactNode;
}) => (
  <section className="bg-muted/40 flex-1">
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 sm:py-20">
      <Link href="/" aria-label="Acme Tech home">
        <Logo size="sm" />
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 text-center text-sm">{subtitle}</p>

      <Card elevated className="mt-8 w-full">
        <CardContent>{children}</CardContent>
      </Card>

      <p className="text-muted-foreground mt-6 flex items-center gap-2 text-xs">
        <ShieldCheck className="text-primary size-4 shrink-0" aria-hidden="true" />
        Payments stay in escrow until you confirm delivery.
      </p>
    </div>
  </section>
);

export const FocusedSignIn = () => (
  <FocusedShell title="Welcome back" subtitle="Sign in to see your orders and listings.">
    <SignInFormMock signUpHref="/mocks/auth/focused/sign-up" />
  </FocusedShell>
);

export const FocusedSignUp = () => (
  <FocusedShell
    title="Create your account"
    subtitle="One account for buying — and for selling, once you set up an organization."
  >
    <SignUpFormMock signInHref="/mocks/auth/focused/sign-in" />
  </FocusedShell>
);
