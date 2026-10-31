import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../components/layout/container.tsx';

export const metadata: Metadata = {
  title: 'Terms and conditions',
  description:
    'The terms under which Acme Tech operates: orders, escrow, returns, warranty and seller obligations.',
};

/**
 * Plain prose rendered from data, so the numbered structure stays consistent and a section is one
 * object rather than a block of JSX. Placeholder legal text: it mirrors how the platform actually
 * behaves (escrow, reservation expiry, returns, fees) but has seen no lawyer.
 */
const sections = [
  {
    title: 'Who we are and what this is',
    body: [
      'Acme Tech AB ("Acme Tech", "we") operates a marketplace where verified business sellers offer professionally refurbished laptops to buyers. We are the marketplace operator and payment intermediary; the purchase contract for a laptop is between you and the seller named on the listing.',
      'These terms are a pre-release placeholder. They describe the behavior the platform enforces today, and will be replaced by reviewed terms before the service goes live.',
    ],
  },
  {
    title: 'Accounts',
    body: [
      'You need an account to buy or sell. Keep your sign-in details to yourself; sessions can be ended at any time from your account, and signing out invalidates them immediately. We may suspend accounts used fraudulently or in breach of these terms.',
    ],
  },
  {
    title: 'Orders and reservation',
    body: [
      'Placing an order reserves the specific laptop for 24 hours. If payment is not completed within that window, the reservation expires automatically and the laptop returns to sale. An order becomes binding when payment reaches escrow.',
    ],
  },
  {
    title: 'Payment and escrow',
    body: [
      'All payments are made to Acme Tech and held in escrow. The seller is paid at settlement, after the order is confirmed as shipped, less the marketplace fee of 8 % of the sale price. Buyers never pay the marketplace fee; it is borne by the seller.',
      'If an order is cancelled or expires before shipment, the full amount is returned to the buyer from escrow. Every movement of money is recorded on the order timeline, visible to both parties.',
    ],
  },
  {
    title: 'Condition grades and listings',
    body: [
      "Grades (Fair, Good, Excellent) describe cosmetic condition only; every listed laptop must be fully functional, data-wiped, and listed with its measured battery health. Sellers are responsible for the accuracy of their listings. A machine materially worse than described may be returned as misdescribed, at the seller's cost, independent of the 30-day window.",
    ],
  },
  {
    title: 'Right of withdrawal and returns',
    body: [
      'Buyers may return a laptop within 30 days of delivery without giving a reason. The refund is issued from escrow to the original payment method once the return is registered. Normal examination of the machine is fine; damage beyond that may be deducted from the refund in line with Swedish consumer law (distansavtalslagen).',
    ],
  },
  {
    title: 'Warranty',
    body: [
      'Every purchase includes a 24-month warranty on functional faults, handled through Acme Tech. The warranty does not cover accidental damage or cosmetic wear consistent with the stated grade. Statutory rights under Swedish consumer law (konsumentköplagen) apply in addition and are never limited by these terms.',
    ],
  },
  {
    title: 'Seller obligations',
    body: [
      'Sellers must be registered businesses, verified before their first listing. They must ship funded orders within 48 hours with tracked delivery, honour the returns and warranty terms above, and take back end-of-life machines for certified recycling.',
    ],
  },
  {
    title: 'Liability',
    body: [
      'We are liable for the operation of the marketplace and the safekeeping of escrowed funds. We are not liable for indirect losses, such as lost data or lost profit, except where liability cannot be limited under mandatory law.',
    ],
  },
  {
    title: 'Disputes and governing law',
    body: [
      'Swedish law governs these terms. Consumers may bring disputes to the Swedish National Board for Consumer Disputes (Allmänna reklamationsnämnden, ARN) or the EU online dispute resolution platform; we participate in ARN proceedings.',
    ],
  },
] as const;

const Page = () => (
  <Container width="narrow" className="py-16 sm:py-20">
    <h1 className="text-4xl font-semibold tracking-tight">Terms and conditions</h1>
    <p className="text-muted-foreground mt-3 text-sm">
      Pre-release placeholder · last updated 28 October 2026
    </p>

    <ol className="mt-10 flex list-none flex-col gap-10">
      {sections.map((section, index) => (
        <li key={section.title}>
          <h2 className="text-xl font-semibold tracking-tight">
            <span className="text-primary mr-2 font-mono text-base">{index + 1}.</span>
            {section.title}
          </h2>
          {section.body.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="text-muted-foreground mt-3 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </li>
      ))}
    </ol>

    <p className="text-muted-foreground border-border mt-12 border-t pt-6 text-sm">
      See also the{' '}
      <Link href="/privacy" className="text-primary hover:underline">
        privacy policy
      </Link>{' '}
      and{' '}
      <Link href="/faq" className="text-primary hover:underline">
        FAQ
      </Link>
      .
    </p>
  </Container>
);

export default Page;
