import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';
import {
  type OrderMockPage,
  confirmDirections,
  orderPageDirections,
  orderStatesMock,
  ordersListMock,
} from '../../../features/order-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Buyer ordering mockups',
  description:
    'Two directions for the confirmation step, two for the order page, the four order states, and the /orders list.',
};

const MockCard = ({ mock }: { mock: OrderMockPage }) => (
  <Card className="hover:border-primary/40 h-full transition-colors">
    <CardContent className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{mock.name}</h3>
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
);

/**
 * The gallery. The two argued surfaces come as competing directions; the states board and the
 * list are the states every direction must handle, so choosing a direction never discards them.
 */
const Page = () => (
  <Container className="py-16 sm:py-20">
    <div className="max-w-2xl">
      <Badge variant="accent">Mockups · static content</Badge>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">Buyer ordering</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        The commitment step and everything the buyer does with an order before paying (UC-001,
        UC-013, UC-014; design spec <code className="text-sm">docs/design/buyer-ordering.md</code>).
        Two surfaces carry a real layout argument; the rest is contract.
      </p>
      <p className="text-muted-foreground mt-3 text-sm">
        Nothing here submits, fetches, or reserves anything. There is deliberately no Pay button
        (spec D6) and no marketplace fee anywhere (D12).
      </p>
    </div>

    <div className="mt-14 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">The confirmation step</h2>
      <p className="text-muted-foreground mt-2">
        D2 settles that ordering has an explicit confirmation; these two directions argue about what
        kind of moment it is — a checkpoint the buyer clears without leaving the listing, or a page
        the buyer reads before committing.
      </p>
    </div>
    <ul className="mt-6 grid gap-5 lg:grid-cols-2">
      {confirmDirections.map((mock) => (
        <li key={mock.href}>
          <MockCard mock={mock} />
        </li>
      ))}
    </ul>

    <div className="mt-16 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">The order page</h2>
      <p className="text-muted-foreground mt-2">
        Both directions render the same contract — status, the product-owned next-step line (D11),
        the timeline as one section (D10), the snapshot, cancel — and differ in whether the status
        stays pinned beside the content or leads a single readable column.
      </p>
    </div>
    <ul className="mt-6 grid gap-5 lg:grid-cols-2">
      {orderPageDirections.map((mock) => (
        <li key={mock.href}>
          <MockCard mock={mock} />
        </li>
      ))}
    </ul>

    <div className="mt-16 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight">States and the list</h2>
      <p className="text-muted-foreground mt-2">
        Not directions — the material every direction must handle: the four order states, and the
        plain `/orders` list with its empty state.
      </p>
    </div>
    <ul className="mt-6 grid gap-5 lg:grid-cols-2">
      {[orderStatesMock, ordersListMock].map((mock) => (
        <li key={mock.href}>
          <MockCard mock={mock} />
        </li>
      ))}
    </ul>
  </Container>
);

export default Page;
