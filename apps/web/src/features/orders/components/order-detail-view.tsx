import { Clock } from 'lucide-react';
import Link from 'next/link';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import type { OrderDetailViewModel, TimelineEntryViewModel } from '../view-models.ts';
import { CancelOrderButton } from './cancel-order-button.tsx';

/**
 * One order as its buyer reads it (UC-014 O3–O5; design "The order page", status-panel
 * direction): snapshot and timeline on the left, a sticky status card on the right with the
 * state, the expiry, the product-owned next-step line (D11), and the actions that remain.
 *
 * Deliberately absent: any payment affordance (D6) and the marketplace fee (D12). Synchronous
 * and complete per ADR-013.
 */
export const OrderDetailView = ({ order }: { readonly order: OrderDetailViewModel }) => (
  <Container className="py-8" width="wide">
    <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
      <Link href="/orders" className="hover:text-foreground">
        Your orders
      </Link>
      <span aria-hidden="true"> / </span>
      <span>{order.id}</span>
    </nav>

    <div className="mt-3 flex flex-wrap items-center gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Your order</h1>
      <Badge variant={order.status.badge}>{order.status.label}</Badge>
    </div>
    <p className="text-muted-foreground mt-1 text-sm">Placed {order.placed}</p>

    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-10">
        <SnapshotSection order={order} />
        <TimelineSection entries={order.timeline} />
      </div>

      <aside className="h-fit lg:sticky lg:top-20">
        <section
          aria-label="Order status"
          className="border-border bg-surface rounded-xl border p-6"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Status</h2>
            <Badge variant={order.status.badge}>{order.status.label}</Badge>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {order.heldUntil !== null && (
              <p className="flex items-center gap-1.5 text-sm">
                <Clock className="size-4 shrink-0" aria-hidden="true" />
                Held for you until <span className="font-medium">{order.heldUntil}</span>
              </p>
            )}
            <p className="text-sm leading-relaxed">
              <span className="font-medium">What happens next: </span>
              {order.status.nextStepLine}
            </p>
          </div>

          <div className="border-border mt-5 border-t pt-5">
            {order.status.cancellable ? (
              <CancelOrderButton orderId={order.id} />
            ) : (
              <p className="text-muted-foreground text-sm">
                No actions here.{' '}
                <Link href={order.listingHref} className="text-primary font-medium hover:underline">
                  View the listing
                </Link>
              </p>
            )}
          </div>
        </section>
      </aside>
    </div>
  </Container>
);

const SnapshotSection = ({ order }: { readonly order: OrderDetailViewModel }) => (
  <section aria-label="What you ordered">
    <h2 className="text-lg font-semibold">What you ordered</h2>
    <p className="text-muted-foreground mt-1 text-xs">
      As promised when you ordered — later edits to the listing never change it.
    </p>
    <div className="border-border bg-surface mt-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          <Link href={order.listingHref} className="hover:underline">
            {order.snapshot.title}
          </Link>
        </h3>
        <Badge variant="outline">{order.snapshot.gradeLabel}</Badge>
      </div>
      <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {order.snapshot.rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 sm:justify-start">
            <dt className="text-muted-foreground w-32 shrink-0">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 sm:justify-start">
          <dt className="text-muted-foreground w-32 shrink-0">Known defects</dt>
          <dd className="font-medium">{order.snapshot.knownDefects}</dd>
        </div>
      </dl>
      <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
        <span className="text-muted-foreground">
          Sold by <span className="text-foreground font-medium">{order.sellerName}</span>
        </span>
        <span className="text-lg font-semibold">{order.price}</span>
      </div>
      <p className="text-muted-foreground mt-3 text-sm">{order.snapshot.fulfillmentExpectations}</p>
    </div>
  </section>
);

/** The timeline is one section of the page (spec D10): history, never the forward-looking banner. */
const TimelineSection = ({ entries }: { readonly entries: readonly TimelineEntryViewModel[] }) => (
  <section aria-label="Order timeline">
    <h2 className="text-lg font-semibold">What has happened</h2>
    <ol className="mt-4">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative pb-6 pl-6 last:pb-0">
          <span
            aria-hidden="true"
            className="border-primary bg-surface absolute top-1 left-0 size-3 rounded-full border-2"
          />
          {index < entries.length - 1 && (
            <span aria-hidden="true" className="bg-border absolute top-4 left-[5px] h-full w-px" />
          )}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h3 className="text-sm font-semibold">{entry.title}</h3>
            <span className="text-muted-foreground text-xs">{entry.when}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{entry.description}</p>
          {entry.note !== null && (
            <p className="text-muted-foreground mt-1 text-sm italic">{entry.note}</p>
          )}
        </li>
      ))}
    </ol>
  </section>
);
