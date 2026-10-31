import { BadgeCheck, Leaf, ReceiptText, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../components/layout/container.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent } from '../../components/ui/card.tsx';

export const metadata: Metadata = {
  title: 'About us',
  description:
    'Why Acme Tech exists: a marketplace for refurbished laptops built around the part that usually goes wrong — the money.',
};

/**
 * Static company page. Like the rest of the pre-release site, the story is real (it describes
 * what the platform enforces) while the figures are invented placeholders.
 */
const principles = [
  {
    icon: ShieldCheck,
    title: 'The money is the product',
    body: 'Marketplaces fail at payment, not at listings. Your payment sits in escrow with us and reaches the seller only once the order is confirmed and shipped. Neither side has to trust a stranger.',
  },
  {
    icon: BadgeCheck,
    title: 'Sellers are businesses, on the record',
    body: 'Every seller is a registered company with a published track record. Ratings come from completed orders only — not from reviews that cannot be traced to a purchase.',
  },
  {
    icon: ReceiptText,
    title: 'Everything is auditable',
    body: 'Each order keeps a timeline of what happened and when: reserved, paid into escrow, shipped, confirmed. Readable long after the sale, by both sides.',
  },
  {
    icon: Leaf,
    title: 'Reuse beats recycling',
    body: 'A laptop that stays in use is worth more than one melted down. Refurbishing avoids most of the CO₂e and raw material of manufacturing new — the greenest laptop already exists.',
  },
] as const;

const Page = () => (
  <>
    <section className="border-border from-accent/40 border-b bg-gradient-to-b to-transparent">
      <Container width="narrow" className="py-16 sm:py-20">
        <h1 className="text-4xl font-semibold tracking-tight">
          Refurbished laptops, bought with confidence.
        </h1>
        <p className="text-muted-foreground mt-5 text-lg">
          Acme Tech is a marketplace for professionally refurbished laptops, built in Sweden. We
          started with a simple observation: people do not avoid used laptops because the machines
          are bad. They avoid them because buying one from a stranger feels like a gamble — on the
          condition, on the battery, and above all on what happens to the money if something goes
          wrong.
        </p>
        <p className="text-muted-foreground mt-4 text-lg">
          So we built the marketplace around that, in this order: the payment, the seller, the
          machine.
        </p>
      </Container>
    </section>

    <section>
      <Container className="py-14 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight">What we enforce</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {principles.map(({ icon: Icon, title, body }) => (
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

    <section id="sustainability" className="bg-muted/40 border-border scroll-mt-20 border-y">
      <Container width="narrow" className="py-14 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Sustainability</h2>
        <p className="text-muted-foreground mt-4">
          Manufacturing a new laptop accounts for the large majority of its lifetime footprint — the
          mining, the fabrication, the shipping — before it is switched on once. Extending a
          machine's life by three or four years is the single most effective thing a buyer can do
          about that footprint.
        </p>
        <p className="text-muted-foreground mt-3">
          Every laptop sold here states its measured battery health, is covered by a 24-month
          warranty, and ships in plastic-free packaging. When a machine truly is at the end of the
          road, our sellers take it back for certified recycling rather than landfill.
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          Impact figures shown across the site are pre-release placeholders; audited numbers come
          with the live service.
        </p>
      </Container>
    </section>

    <section>
      <Container width="narrow" className="py-14 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight">The company</h2>
        <p className="text-muted-foreground mt-4">
          Acme Tech AB is based in Göteborg, Sweden. The marketplace is in pre-release: the platform
          that holds payments in escrow and keeps every order auditable is built and running, and
          the storefront you are reading is taking shape on top of it, page by page.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/faq">Read the FAQ</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </Container>
    </section>
  </>
);

export default Page;
