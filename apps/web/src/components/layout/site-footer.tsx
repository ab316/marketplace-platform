import { CreditCard, RotateCcw, ShieldCheck } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { Logo } from '../brand/logo.tsx';
import { Container } from './container.tsx';

/**
 * Global footer, patterned on the refurbished-marketplace standard (refurbed, Back Market,
 * Inrego): brand and tagline on the left, link columns beside it, a guarantee strip, then a legal
 * row. A Server Component with no state — the newsletter field is presentational until a real
 * subscription flow exists.
 *
 * Every link points at a page that actually renders. A footer full of dead anchors is the
 * fastest way for a "real-looking" site to stop looking real.
 */
const columns: readonly { title: string; links: readonly { label: string; href: Route }[] }[] = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Refurbished laptops', href: '/' },
      { label: 'What the grades mean', href: '/faq#grades' },
      { label: 'Sell on Acme Tech', href: '/faq#selling' },
      { label: 'Sign in', href: '/sign-in' },
      { label: 'Create an account', href: '/sign-up' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'Sustainability', href: '/about#sustainability' },
      { label: 'Contact', href: '/contact' },
      { label: 'Design system', href: '/design-system' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Shipping and delivery', href: '/faq#shipping' },
      { label: 'Returns and refunds', href: '/faq#returns' },
      { label: 'Warranty', href: '/faq#warranty' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms and conditions', href: '/terms' },
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Cookie policy', href: '/privacy#cookies' },
      { label: 'Imprint', href: '/contact#imprint' },
    ],
  },
];

const guarantees = [
  { icon: ShieldCheck, label: 'Payment held in escrow until your order ships' },
  { icon: RotateCcw, label: '30-day free returns and a 24-month warranty' },
  { icon: CreditCard, label: 'Card, Klarna and Swish — all payments secured' },
] as const;

const paymentMethods = ['Visa', 'Mastercard', 'Klarna', 'Swish'] as const;

export const SiteFooter = () => (
  <footer className="border-border bg-muted/40 mt-auto border-t">
    {/* Guarantee strip: the three promises the platform actually enforces, repeated where
        every page ends and the "can I trust this?" question gets asked. */}
    <div className="border-border border-b">
      <Container>
        <ul className="grid gap-x-6 gap-y-3 py-5 sm:grid-cols-3">
          {guarantees.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              <Icon className="text-primary size-4.5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </Container>
    </div>

    <Container>
      <div className="grid gap-10 py-12 lg:grid-cols-[1.2fr_2fr]">
        <div className="flex max-w-sm flex-col items-start gap-4">
          <Link href="/" aria-label="Acme Tech — home" className="rounded-md">
            <Logo size="sm" />
          </Link>
          <p className="text-muted-foreground text-sm">
            The trust-centered marketplace for refurbished laptops. Every machine tested and graded,
            every seller a verified business, every payment held in escrow until the order is on its
            way.
          </p>
          <p className="text-muted-foreground text-sm">
            Questions?{' '}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>{' '}
            — free support, Mon–Fri 09:00–17:00.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">{column.title}</h2>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-border flex flex-col gap-4 border-t py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          © 2026 Acme Tech AB, Göteborg · Org.nr 559000-0000 · Pre-release, not a live service.
        </p>
        <ul aria-label="Accepted payment methods" className="flex flex-wrap items-center gap-2">
          {paymentMethods.map((method) => (
            <li
              key={method}
              className="border-border bg-surface text-muted-foreground rounded-md border px-2.5 py-1 text-xs font-medium"
            >
              {method}
            </li>
          ))}
        </ul>
      </div>
    </Container>
  </footer>
);
