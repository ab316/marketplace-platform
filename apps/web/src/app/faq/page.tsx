import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../components/layout/container.tsx';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about buying and selling refurbished laptops on Acme Tech: grades, shipping, returns, warranty and escrow.',
};

/**
 * FAQ built on native `<details>`/`<summary>`: expandable without any client JavaScript, keyboard
 * accessible by default, and still findable by in-page search in every browser. Sections carry
 * ids so the footer can deep-link (`/faq#returns`).
 */
type Entry = { readonly q: string; readonly a: string };
type Section = { readonly id: string; readonly title: string; readonly entries: readonly Entry[] };

const sections: readonly Section[] = [
  {
    id: 'buying',
    title: 'Buying and paying',
    entries: [
      {
        q: 'How does paying into escrow work?',
        a: 'When you pay, the money is held by Acme Tech — not sent to the seller. The seller sees a confirmed, funded order and ships. Only once the order is confirmed on its way does the payment move on. If the order falls through, the money comes straight back to you.',
      },
      {
        q: 'Which payment methods can I use?',
        a: 'Card (Visa, Mastercard), Klarna and Swish at launch. Whatever the method, the same escrow protection applies.',
      },
      {
        q: 'How long is a laptop reserved for me?',
        a: 'Placing an order reserves the machine for 24 hours. If payment has not arrived by then, the reservation is released automatically and the laptop goes back on sale — nobody can sit on stock without paying.',
      },
    ],
  },
  {
    id: 'grades',
    title: 'Condition grades',
    entries: [
      {
        q: 'What do Fair, Good and Excellent mean?',
        a: 'Grades describe cosmetic condition only. Fair: visible scratches or dents on the lid or deck. Good: light marks you have to look for, no dents, no dead pixels. Excellent: almost no signs of use. Every laptop, whatever the grade, is fully working, battery-tested and covered by the same 24-month warranty.',
      },
      {
        q: 'How do I know the battery is any good?',
        a: 'Every listing states the measured battery health as a percentage of original capacity, tested by the seller during refurbishment. If the battery arrives below the listed health, that is a warranty case — not your problem.',
      },
      {
        q: 'Are the laptops wiped and reset?',
        a: 'Yes. Data wiping to recognised erasure standards is a mandatory refurbishment step; machines arrive with a clean operating system installation and no previous owner accounts.',
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping and delivery',
    entries: [
      {
        q: 'How fast will my laptop arrive?',
        a: 'Sellers ship within 48 hours of a funded order, with tracked delivery across Sweden — typically 1–3 business days in transit. The tracking number appears on your order timeline as soon as the parcel is registered.',
      },
      {
        q: 'What does shipping cost?',
        a: 'Most listings include free tracked shipping; where a seller charges, the cost is shown on the listing and at checkout — never added afterwards.',
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns and refunds',
    entries: [
      {
        q: 'Can I return a laptop if I change my mind?',
        a: 'Yes — 30 days, free, no reason needed. Use it properly in that time; "it is not what I expected" is reason enough. The refund goes back the way you paid.',
      },
      {
        q: 'How do refunds work with escrow?',
        a: 'Inside the return window the money is simple to unwind, because it has not finished its journey: once the return is registered, the refund is issued from escrow without waiting on the seller.',
      },
    ],
  },
  {
    id: 'warranty',
    title: 'Warranty',
    entries: [
      {
        q: 'What does the 24-month warranty cover?',
        a: 'Functional faults: the machine, keyboard, screen, ports and battery working as described. It does not cover accidental damage or cosmetic wear consistent with the stated grade. The warranty is handled through Acme Tech, not passed back to you to argue with a seller.',
      },
      {
        q: 'Who do I contact for a warranty case?',
        a: 'Open the order timeline and start a case there, or contact support. Repairs, replacement or refund are agreed with you before anything ships anywhere.',
      },
    ],
  },
  {
    id: 'selling',
    title: 'Selling on Acme Tech',
    entries: [
      {
        q: 'Who can sell?',
        a: 'Registered businesses that refurbish laptops professionally. Every seller is verified before their first listing and trades under their company name, with a published track record built from completed orders.',
      },
      {
        q: 'What does it cost?',
        a: 'No listing fees. Acme Tech charges a marketplace fee of 8 % of the sale price, deducted at settlement — after the order is confirmed, not before.',
      },
      {
        q: 'When do sellers get paid?',
        a: 'At settlement, once the order is confirmed on its way to the buyer. Escrow protects sellers too: an order is never shipped against an unfunded payment.',
      },
    ],
  },
];

const Page = () => (
  <Container width="narrow" className="py-16 sm:py-20">
    <h1 className="text-4xl font-semibold tracking-tight">Frequently asked questions</h1>
    <p className="text-muted-foreground mt-4 text-lg">
      The short version: payment held in escrow, 30-day free returns, 24-month warranty, grades that
      describe looks and never function. The longer version is below. Pre-release: policies
      described here take effect with the live service.
    </p>

    <nav aria-label="FAQ sections" className="mt-8 flex flex-wrap gap-2">
      {sections.map((section) => (
        <Link
          key={section.id}
          href={`/faq#${section.id}`}
          className="border-border bg-surface text-muted-foreground hover:text-foreground rounded-full border px-3 py-1 text-sm transition-colors"
        >
          {section.title}
        </Link>
      ))}
    </nav>

    <div className="mt-10 flex flex-col gap-10">
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-h`}
          className="scroll-mt-20"
        >
          <h2 id={`${section.id}-h`} className="text-xl font-semibold tracking-tight">
            {section.title}
          </h2>
          <div className="border-border mt-4 flex flex-col divide-y rounded-xl border">
            {section.entries.map((entry) => (
              <details
                key={entry.q}
                className="group bg-surface px-5 first:rounded-t-xl last:rounded-b-xl"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 font-medium">
                  {entry.q}
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-muted-foreground -mt-1 pb-5 text-sm leading-relaxed">
                  {entry.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>

    <p className="text-muted-foreground mt-12 text-sm">
      Not answered here?{' '}
      <Link href="/contact" className="text-primary hover:underline">
        Contact support
      </Link>{' '}
      — Mon–Fri 09:00–17:00.
    </p>
  </Container>
);

export default Page;
