import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../components/layout/container.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Card, CardContent } from '../../components/ui/card.tsx';
import { catalogueMockPages } from '../../features/catalogue-mocks/index.ts';
import { brandMock, mockRoutes } from '../../features/home-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockups',
  description:
    'Static design mockups: home-page directions, auth pages, catalogue search states, and the brand board.',
};

/**
 * The gallery. Each mockup states what it is arguing for, so the choice between them is a product
 * decision about *who is arriving* rather than a preference between three sets of pixels.
 */
const Page = () => (
  <Container className="py-16 sm:py-20">
    <div className="max-w-2xl">
      <Badge variant="accent">Mockups · static content</Badge>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">Design mockups</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        Surfaces argued out before they are wired to the backend. The home page is three competing
        directions; the other sections are the states one surface has to handle.
      </p>
      <p className="text-muted-foreground mt-3 text-sm">
        Nothing here fetches. Prices, sellers, ratings and impact figures are invented.
      </p>
    </div>

    <div className="mt-14 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">Home page</h2>
      <p className="text-muted-foreground mt-2">
        Three takes on the same marketplace, built from the same design tokens and the same product
        card. They differ in what they assume about the person who just arrived — and that is the
        decision worth making first.
      </p>
    </div>

    <ul className="mt-6 grid gap-5 lg:grid-cols-2">
      {mockRoutes.map((mock) => (
        <li key={mock.href}>
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardContent className="flex h-full flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{mock.name}</h2>
                <Badge variant="outline">{mock.reference}</Badge>
              </div>

              <p className="text-muted-foreground flex-1 text-sm">{mock.thesis}</p>

              <Link
                href={mock.href}
                className="text-primary mt-1 inline-flex items-center gap-1.5 self-start text-sm font-medium hover:underline"
              >
                Open {mock.name.toLowerCase()}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>

              <p className="text-muted-foreground font-mono text-xs">{mock.href}</p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>

    <div className="mt-16 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">Sign-in and sign-up</h2>
      <p className="text-muted-foreground mt-2">
        A separate gallery for the authentication pages: two layout directions built on the exact
        same form, plus a board of every error and pending state from UC-002.
      </p>
    </div>

    <Card className="hover:border-primary/40 mt-6 max-w-xl transition-colors">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Auth-page directions</h3>
          <Badge variant="outline">UC-002 over the web</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Is signing in a chore to finish in five seconds, or the moment a first-time buyer decides
          to trust the escrow? The two directions take opposite sides.
        </p>
        <Link
          href="/mocks/auth"
          className="text-primary mt-1 inline-flex items-center gap-1.5 self-start text-sm font-medium hover:underline"
        >
          Open the auth gallery
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <p className="text-muted-foreground font-mono text-xs">/mocks/auth</p>
      </CardContent>
    </Card>

    <div className="mt-16 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">Catalogue search</h2>
      <p className="text-muted-foreground mt-2">
        Not competing directions — the three states one page has to handle (UC-006): results,
        results with every filter engaged, and a search that matches nothing. The last is the one a
        thin catalogue produces constantly and the one most likely to be invented during
        implementation if it is not designed first.
      </p>
    </div>

    <ul className="mt-6 grid gap-5 lg:grid-cols-3">
      {catalogueMockPages.map((mock) => (
        <li key={mock.href}>
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardContent className="flex h-full flex-col gap-3">
              <h3 className="text-lg font-semibold">{mock.name}</h3>

              <p className="text-muted-foreground flex-1 text-sm">{mock.thesis}</p>

              <Link
                href={mock.href}
                className="text-primary mt-1 inline-flex items-center gap-1.5 self-start text-sm font-medium hover:underline"
              >
                Open {mock.name.toLowerCase()}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>

              <p className="text-muted-foreground font-mono text-xs">{mock.href}</p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>

    <div className="mt-16 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">Brand</h2>
      <p className="text-muted-foreground mt-2">
        The name and the mark, separate from the page layout: a home page can change direction
        without the logo moving, and the reverse.
      </p>
    </div>

    <Card className="hover:border-primary/40 mt-6 max-w-xl transition-colors">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{brandMock.name}</h3>
          <Badge variant="outline">{brandMock.reference}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{brandMock.thesis}</p>
        <Link
          href={brandMock.href}
          className="text-primary mt-1 inline-flex items-center gap-1.5 self-start text-sm font-medium hover:underline"
        >
          Open the brand board
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <p className="text-muted-foreground font-mono text-xs">{brandMock.href}</p>
      </CardContent>
    </Card>
  </Container>
);

export default Page;
