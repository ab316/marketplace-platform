import Link from 'next/link';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { cn } from '../../../lib/cn.ts';
import {
  type MockOrderStateView,
  type MockTimelineEntry,
  formatSek,
  snapshot,
} from '../mock-data.ts';
import {
  confirmDirections,
  orderPageDirections,
  orderStatesMock,
  ordersListMock,
} from '../mock-routes.ts';

/**
 * Pieces shared by every buyer-ordering mockup, so the directions differ only where they argue
 * (design spec: `docs/design/buyer-ordering.md`). Presentational only: decorative controls carry
 * `aria-hidden`, nothing handles events, no JavaScript ships.
 */

const switcherLinks = [
  ...confirmDirections,
  ...orderPageDirections,
  orderStatesMock,
  ordersListMock,
];

export const OrderMockSwitcher = ({ current }: { current: string }) => (
  <div className="border-border bg-muted/40 border-b">
    <Container className="flex flex-wrap items-center gap-2 py-2 text-sm" width="wide">
      <span className="text-muted-foreground mr-2">
        <Link href="/mocks/orders" className="text-foreground font-medium hover:underline">
          Ordering mockups
        </Link>{' '}
        · static content:
      </span>
      {switcherLinks.map(({ href, name }) => (
        <Link
          key={href}
          href={href}
          aria-current={href === current ? 'page' : undefined}
          className={cn(
            'rounded-md px-2.5 py-1',
            href === current
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          )}
        >
          {name}
        </Link>
      ))}
    </Container>
  </div>
);

/** A decorative stand-in for a button: looks like the real thing, does nothing, announces nothing. */
export const FakeButton = ({
  children,
  variant = 'primary',
  className,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger-outline';
  className?: string;
}) => (
  <div
    aria-hidden="true"
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium',
      variant === 'primary' && 'bg-primary text-primary-foreground shadow-subtle',
      variant === 'secondary' && 'bg-surface text-foreground border-border border',
      variant === 'danger-outline' && 'text-danger border-danger/40 bg-surface border',
      className
    )}
  >
    {children}
  </div>
);

/** The status badge plus the one forward-looking line the product owns (D11). */
export const NextStepLine = ({ view }: { view: MockOrderStateView }) => (
  <p className="text-foreground text-sm leading-relaxed">
    <span className="font-medium">What happens next: </span>
    {view.nextStepLine}
  </p>
);

const TimelineEntry = ({ entry, isLast }: { entry: MockTimelineEntry; isLast: boolean }) => (
  <li className="relative pb-6 pl-6 last:pb-0">
    <span
      aria-hidden="true"
      className="border-primary bg-surface absolute top-1 left-0 size-3 rounded-full border-2"
    />
    {!isLast && (
      <span aria-hidden="true" className="bg-border absolute top-4 left-[5px] h-full w-px" />
    )}
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <h3 className="text-sm font-semibold">{entry.title}</h3>
      <span className="text-muted-foreground text-xs">{entry.when}</span>
    </div>
    <p className="text-muted-foreground mt-1 text-sm">{entry.description}</p>
    {entry.nextStep !== undefined && (
      <p className="text-muted-foreground mt-1 text-sm italic">{entry.nextStep}</p>
    )}
  </li>
);

/** The timeline as one section of the page (D10), never the page itself. */
export const TimelineSection = ({ entries }: { entries: readonly MockTimelineEntry[] }) => (
  <section aria-label="Order timeline">
    <h2 className="text-lg font-semibold">What has happened</h2>
    <ol className="mt-4">
      {entries.map((entry, index) => (
        <TimelineEntry key={entry.title} entry={entry} isLast={index === entries.length - 1} />
      ))}
    </ol>
  </section>
);

/**
 * The immutable snapshot, framed as what was promised at the time of ordering — never the listing
 * as it is now (UC-014 O3). The fee is nowhere on it (D12).
 */
export const SnapshotPanel = ({ heading = 'What you ordered' }: { heading?: string }) => (
  <section aria-label={heading}>
    <h2 className="text-lg font-semibold">{heading}</h2>
    <p className="text-muted-foreground mt-1 text-xs">
      As promised when you ordered — later edits to the listing never change it.
    </p>
    <div className="border-border bg-surface mt-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{snapshot.title}</h3>
        <Badge variant="success">
          Grade {snapshot.grade} · {snapshot.gradeWord}
        </Badge>
      </div>
      <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {snapshot.specs.map((spec) => (
          <div key={spec.label} className="flex justify-between gap-4 sm:justify-start">
            <dt className="text-muted-foreground w-32 shrink-0">{spec.label}</dt>
            <dd className="font-medium">{spec.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 sm:justify-start">
          <dt className="text-muted-foreground w-32 shrink-0">Known defects</dt>
          <dd className="font-medium">{snapshot.knownDefects}</dd>
        </div>
      </dl>
      <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
        <span className="text-muted-foreground">
          Sold by <span className="text-foreground font-medium">{snapshot.sellerName}</span>
        </span>
        <span className="text-lg font-semibold">{formatSek(snapshot.priceMinor)}</span>
      </div>
      <p className="text-muted-foreground mt-3 text-sm">{snapshot.fulfillment}</p>
    </div>
  </section>
);
