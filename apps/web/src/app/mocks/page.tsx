import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../components/layout/container.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Card, CardContent } from '../../components/ui/card.tsx';
import { brandMock, mockRoutes } from '../../features/home-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Home-page mockups',
  description:
    'Three directions for the marketplace home page, each arguing for a different visitor.',
};

/**
 * The gallery. Each mockup states what it is arguing for, so the choice between them is a product
 * decision about *who is arriving* rather than a preference between three sets of pixels.
 */
const Page = () => (
  <Container className="py-16 sm:py-20">
    <div className="max-w-2xl">
      <Badge variant="accent">Mockups · static content</Badge>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">Home-page directions</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        Three takes on the same marketplace, built from the same design tokens and the same product
        card. They differ in what they assume about the person who just arrived — and that is the
        decision worth making before any of this is wired to the backend.
      </p>
      <p className="text-muted-foreground mt-3 text-sm">
        Nothing here fetches. Prices, sellers, ratings and impact figures are invented.
      </p>
    </div>

    <ul className="mt-10 grid gap-5 lg:grid-cols-2">
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
