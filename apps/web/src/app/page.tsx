import { ArrowRight, BadgeCheck, ReceiptText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { Container } from '../components/layout/container.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Button } from '../components/ui/button.tsx';
import { Card, CardContent } from '../components/ui/card.tsx';

/**
 * Sample page: establishes the visual language and proves the server-rendered shell works.
 *
 * Deliberately static — it fetches nothing. Real buyer, seller, and operator pages arrive with
 * their use cases in Phase 6 (UC-001, UC-004, UC-005) and will load data through `src/data/`.
 */

const pillars = [
  {
    icon: ShieldCheck,
    title: 'Money held in escrow',
    body: 'Payment is held until the order is confirmed, so neither side has to trust the other first.',
  },
  {
    icon: BadgeCheck,
    title: 'Sellers are accountable',
    body: 'Every seller trades as a registered organization with a record attached to their name.',
  },
  {
    icon: ReceiptText,
    title: 'A complete audit trail',
    body: 'Each order keeps a timeline of what happened and when — readable long after the sale.',
  },
];

const Home = () => (
  <>
    <section className="border-border border-b">
      <Container className="py-20 sm:py-28">
        <div className="flex max-w-2xl flex-col items-start gap-6">
          <Badge variant="accent">Pre-release · backend workflow is live</Badge>

          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Refurbished computers, bought with confidence.
          </h1>

          <p className="text-muted-foreground max-w-prose text-lg">
            A marketplace built around the part that usually goes wrong: the money. Payments sit in
            escrow until an order is confirmed, and every step is recorded.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/design-system">
                View the design system
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="https://github.com/ab316/marketplace-platform">Read the architecture</a>
            </Button>
          </div>
        </div>
      </Container>
    </section>

    <section>
      <Container className="py-16 sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight">How the trust loop works</h2>
        <p className="text-muted-foreground mt-2 max-w-prose">
          Three guarantees the platform enforces in the backend, not in the interface.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-3">
                  <span className="bg-accent text-accent-foreground grid size-9 place-items-center rounded-lg">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-muted-foreground text-sm">{body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  </>
);

export default Home;
