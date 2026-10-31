import { Clock, Mail, MapPin, Store } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../components/layout/container.tsx';
import { Card, CardContent } from '../../components/ui/card.tsx';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to reach Acme Tech: buyer support, seller support, and company details.',
};

const channels = [
  {
    icon: Mail,
    title: 'Buyer support',
    lines: ['support@acmetech.example', 'Answers within one business day.'],
  },
  {
    icon: Store,
    title: 'Sellers and partners',
    lines: ['sellers@acmetech.example', 'Onboarding, listings and settlement questions.'],
  },
  {
    icon: Clock,
    title: 'Opening hours',
    lines: ['Monday–Friday, 09:00–17:00 CET', 'Free support — no premium numbers.'],
  },
  {
    icon: MapPin,
    title: 'Visit us',
    lines: ['Acme Tech AB, Exempelgatan 12', '411 01 Göteborg, Sweden'],
  },
] as const;

const Page = () => (
  <>
    <Container width="narrow" className="py-16 sm:py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Contact</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        An order question is usually fastest to answer from the order timeline — every step of
        payment, shipping and confirmation is recorded there. For everything else, reach us
        directly. The addresses below are pre-release placeholders.
      </p>
    </Container>

    <Container className="pb-16">
      <ul className="grid gap-4 sm:grid-cols-2">
        {channels.map(({ icon: Icon, title, lines }) => (
          <li key={title}>
            <Card className="h-full">
              <CardContent className="flex flex-col gap-3">
                <span className="bg-accent text-accent-foreground grid size-9 place-items-center rounded-lg">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <h2 className="font-semibold">{title}</h2>
                {lines.map((line) => (
                  <p key={line} className="text-muted-foreground -mt-1 text-sm">
                    {line}
                  </p>
                ))}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <section id="imprint" className="border-border mt-12 max-w-2xl scroll-mt-20 border-t pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Imprint</h2>
        <dl className="text-muted-foreground mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="font-medium">Legal entity</dt>
          <dd>Acme Tech AB (pre-release placeholder)</dd>
          <dt className="font-medium">Registered office</dt>
          <dd>Exempelgatan 12, 411 01 Göteborg, Sweden</dd>
          <dt className="font-medium">Registration number</dt>
          <dd>559000-0000</dd>
          <dt className="font-medium">VAT ID</dt>
          <dd>SE559000000001</dd>
          <dt className="font-medium">Responsible for content</dt>
          <dd>The Acme Tech founding team</dd>
        </dl>
        <p className="text-muted-foreground mt-4 text-sm">
          Disputes that cannot be resolved with us directly can be brought to the Swedish National
          Board for Consumer Disputes (ARN) or the EU online dispute resolution platform. Details in
          the{' '}
          <Link href="/terms" className="text-primary hover:underline">
            terms and conditions
          </Link>
          .
        </p>
      </section>
    </Container>
  </>
);

export default Page;
