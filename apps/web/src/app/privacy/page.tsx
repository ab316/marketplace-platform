import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '../../components/layout/container.tsx';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What data Acme Tech collects, why, how long it is kept, and your rights under the GDPR.',
};

/** Placeholder policy, structured the way the GDPR expects: what, why, how long, your rights. */
const sections = [
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: [
      'Account data: name, email address and password hash. Order data: what you bought or sold, the delivery address, and the order timeline. Payment data is handled by our payment providers; we store the reference, never the card number. Support conversations are kept with the order they concern.',
    ],
  },
  {
    id: 'why',
    title: 'Why we process it',
    body: [
      'To run the marketplace: taking orders, holding payments in escrow, arranging delivery, handling returns and warranty cases (performance of contract). To keep auditable financial records (legal obligation). To prevent fraud and secure accounts (legitimate interest). Marketing email is sent only with consent, and every message carries an unsubscribe link.',
    ],
  },
  {
    id: 'sharing',
    title: 'Who sees it',
    body: [
      'The seller sees what they need to fulfil your order: your name and delivery address, never your payment details. Payment and delivery providers receive the minimum needed for their part. We do not sell personal data, full stop.',
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: [
      'Order and ledger records are kept for seven years, as Swedish bookkeeping law requires. Account data is kept while the account exists and deleted within 30 days of account closure, except where an open order or legal obligation requires longer. Sessions expire automatically and can be ended by you at any time.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: [
      'We use one strictly necessary cookie: the session cookie that keeps you signed in (httpOnly, secure). The theme preference is stored in your browser only. There are no advertising or cross-site tracking cookies, so there is no cookie banner to click away.',
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: [
      'Under the GDPR you can request access to your data, correction, deletion, restriction, portability, and object to processing based on legitimate interest. Write to privacy@acmetech.example and we respond within 30 days. You can also complain to the Swedish privacy authority, Integritetsskyddsmyndigheten (IMY).',
    ],
  },
] as const;

const Page = () => (
  <Container width="narrow" className="py-16 sm:py-20">
    <h1 className="text-4xl font-semibold tracking-tight">Privacy policy</h1>
    <p className="text-muted-foreground mt-3 text-sm">
      Pre-release placeholder · last updated 28 October 2026 · Controller: Acme Tech AB, Göteborg
    </p>
    <p className="text-muted-foreground mt-6 text-lg">
      The principle: we collect what the marketplace needs to work, keep it as long as the law
      requires, and nothing is sold to anyone. The specifics are below.
    </p>

    <div className="mt-10 flex flex-col gap-10">
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="text-muted-foreground mt-3 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>

    <p className="text-muted-foreground border-border mt-12 border-t pt-6 text-sm">
      Questions about your data?{' '}
      <Link href="/contact" className="text-primary hover:underline">
        Contact us
      </Link>{' '}
      or see the{' '}
      <Link href="/terms" className="text-primary hover:underline">
        terms and conditions
      </Link>
      .
    </p>
  </Container>
);

export default Page;
