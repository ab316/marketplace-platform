import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';
import { authMockDirections, authStatesMock } from '../../../features/auth-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Sign-in and sign-up mockups',
  description:
    'Two directions for the authentication pages, plus every form state the implementation must handle.',
};

/**
 * The gallery. Each direction states what it is arguing for, so the choice between them is a
 * product decision about *what signing in means here* rather than a preference between pixels.
 */
const Page = () => (
  <Container className="py-16 sm:py-20">
    <div className="max-w-2xl">
      <Badge variant="accent">Mockups · static content</Badge>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">Sign-in and sign-up directions</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        Two takes on the authentication pages, built from the same design tokens and the exact same
        form. They differ in whether these pages are a chore to minimize or a trust moment to spend
        — the decision worth making before anything is wired to the backend.
      </p>
      <p className="text-muted-foreground mt-3 text-sm">
        Nothing here submits or sets a cookie. Both directions show the same single sign-up for
        buyers and sellers: there is no seller account type (PD-0003) and no social sign-in yet
        (ADR-012).
      </p>
    </div>

    <ul className="mt-10 grid gap-5 lg:grid-cols-2">
      {authMockDirections.map((direction) => (
        <li key={direction.name}>
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardContent className="flex h-full flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{direction.name}</h2>
                <Badge variant="outline">{direction.reference}</Badge>
              </div>

              <p className="text-muted-foreground flex-1 text-sm">{direction.thesis}</p>

              <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                <Link
                  href={direction.signInHref}
                  className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  Sign in
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href={direction.signUpHref}
                  className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  Sign up
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>

              <p className="text-muted-foreground font-mono text-xs">{direction.signInHref}</p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>

    <div className="mt-16 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">States</h2>
      <p className="text-muted-foreground mt-2">
        Separate from the layout argument: the error, validation, and pending states both directions
        must handle identically.
      </p>
    </div>

    <Card className="hover:border-primary/40 mt-6 max-w-xl transition-colors">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{authStatesMock.name}</h3>
          <Badge variant="outline">UC-002 E1–E3</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{authStatesMock.thesis}</p>
        <Link
          href={authStatesMock.href}
          className="text-primary mt-1 inline-flex items-center gap-1.5 self-start text-sm font-medium hover:underline"
        >
          Open the states board
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <p className="text-muted-foreground font-mono text-xs">{authStatesMock.href}</p>
      </CardContent>
    </Card>
  </Container>
);

export default Page;
