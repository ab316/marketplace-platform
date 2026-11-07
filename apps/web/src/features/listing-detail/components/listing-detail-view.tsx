import { ArrowLeft, Store } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Button } from '../../../components/ui/button.tsx';
import type {
  Availability,
  DetailSection,
  ListingDetailViewModel,
  OrderAction,
} from '../view-models.ts';

const AVAILABILITY_BADGE: Readonly<
  Record<Availability['kind'], 'success' | 'warning' | 'neutral'>
> = {
  available: 'success',
  'sold-out': 'warning',
  archived: 'neutral',
};

/**
 * One listing as a buyer reads it (UC-012). Synchronous and complete: every state the page can
 * be in is a prop, so the async page above it is a thin shell (ADR-013).
 */
export const ListingDetailView = ({
  listing,
  orderAction,
  backHref,
  backLabel,
}: {
  readonly listing: ListingDetailViewModel;
  readonly orderAction: OrderAction;
  readonly backHref: Route;
  readonly backLabel: string;
}) => (
  <Container className="py-8">
    <Link
      href={backHref}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {backLabel}
    </Link>

    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{listing.title}</h1>
        <Badge variant="outline">
          Grade {listing.grade.letter} · {listing.grade.name}
        </Badge>
      </div>
      <p className="text-muted-foreground">{listing.subtitle}</p>
    </div>

    <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 grow flex-col gap-8">
        <Section section={listing.specifications} />

        <section aria-label="Condition" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Condition</h2>
          <Rows rows={listing.condition.rows} />
          <p className="text-muted-foreground text-sm">
            Grades describe cosmetic condition only, and are a floor: every unit looks at least this
            good. {listing.grade.definition}
          </p>
          {/* The disclosure a buyer is most likely to miss and most likely to dispute: never
              collapsed, never truncated (design "Key components"). */}
          <div className="border-border bg-surface rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Known defects</h3>
            <p className="mt-1 text-sm whitespace-pre-line">{listing.knownDefects}</p>
          </div>
        </section>

        <section aria-label="Description" className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Description</h2>
          <p className="text-sm whitespace-pre-line">{listing.description}</p>
        </section>

        <section aria-label="What happens after you pay" className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">What happens after you pay</h2>
          <p className="text-sm whitespace-pre-line">{listing.fulfillmentExpectations}</p>
        </section>
      </div>

      <aside className="w-full shrink-0 lg:sticky lg:top-8 lg:w-80">
        <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-semibold">{listing.price}</p>
            <Badge variant={AVAILABILITY_BADGE[listing.availability.kind]}>
              {listing.availability.label}
            </Badge>
          </div>

          {listing.availability.kind === 'available' ? null : (
            <p className="text-muted-foreground text-sm">{listing.availability.explanation}</p>
          )}

          <OrderActionArea action={orderAction} />

          <p className="text-muted-foreground border-border border-t pt-4 text-xs">
            Ordering holds one unit for 24 hours. No money moves until you pay, and payment is held
            in escrow until you confirm the order is complete.
          </p>
        </div>

        <section
          aria-label="Sold by"
          className="border-border bg-surface mt-4 flex flex-col gap-2 rounded-xl border p-5"
        >
          <h2 className="text-sm font-semibold">Sold by</h2>
          <p className="flex items-center gap-2 text-sm">
            <Store className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            {listing.sellerName}
          </p>
        </section>
      </aside>
    </div>
  </Container>
);

/**
 * The next step this viewer has (UC-012 V7). Ordering itself is the next slice, so the action a
 * buyer will use is shown as not yet open rather than as a button that does nothing.
 */
const OrderActionArea = ({ action }: { readonly action: OrderAction }) => {
  if (action.kind === 'unavailable') {
    return (
      <Button asChild variant="secondary" className="w-full">
        <Link href="/listings">Browse other laptops</Link>
      </Button>
    );
  }

  if (action.kind === 'own-organization') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          This is your organization&rsquo;s listing, so you cannot order it.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href={action.href}>Manage this listing</Link>
        </Button>
      </div>
    );
  }

  if (action.kind === 'staff') {
    return (
      <p className="text-sm">
        Marketplace staff do not place orders. Use the operator tools to inspect this listing.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button disabled className="w-full">
        Order this laptop
      </Button>
      <p className="text-muted-foreground text-xs">
        Ordering from the browser opens with the next release.
      </p>
    </div>
  );
};

const Section = ({ section }: { readonly section: DetailSection }) => (
  <section aria-label={section.title} className="flex flex-col gap-3">
    <h2 className="text-base font-semibold">{section.title}</h2>
    <Rows rows={section.rows} />
  </section>
);

const Rows = ({ rows }: { readonly rows: DetailSection['rows'] }) => (
  <dl className="divide-border border-border divide-y rounded-lg border text-sm">
    {rows.map((row) => (
      <div key={row.label} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[12rem_1fr]">
        <dt className="text-muted-foreground font-medium">{row.label}</dt>
        <dd>{row.value}</dd>
      </div>
    ))}
  </dl>
);
