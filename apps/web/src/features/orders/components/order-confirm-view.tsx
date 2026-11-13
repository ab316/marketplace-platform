import { ArrowLeft, ShieldCheck, Store } from 'lucide-react';
import Link from 'next/link';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import type { OrderConfirmViewModel } from '../view-models.ts';
import { PlaceOrderForm } from './place-order-form.tsx';

/**
 * The confirmation page (UC-001 B3, spec D2; design "The confirmation step", full-page
 * direction). Synchronous and complete per ADR-013: the async route resolves the listing and
 * the viewer, this renders the commitment.
 */
export const OrderConfirmView = ({ listing }: { readonly listing: OrderConfirmViewModel }) => (
  <Container className="py-10" width="narrow">
    <Link
      href={listing.listingHref}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to the listing
    </Link>

    <h1 className="mt-4 text-2xl font-semibold tracking-tight">Confirm your order</h1>
    <p className="text-muted-foreground mt-2">
      One step, and the laptop is held for you. Read what you are committing to — it is deliberately
      short.
    </p>

    <section
      aria-label="Your commitment"
      className="border-border bg-surface mt-8 rounded-xl border p-6"
    >
      <h2 className="font-semibold">Your commitment</h2>
      <ul className="mt-4 space-y-2 text-sm">
        <li>
          · One unit of {listing.title}, sold by {listing.sellerName}.
        </li>
        <li>
          · You pay {listing.price} — but <strong>no money is taken now</strong>. Paying is a
          separate step after the order exists.
        </li>
        <li>
          · The unit is held for you for <strong>24 hours</strong>. Unpaid orders are cancelled
          automatically, and you can cancel at any time before paying.
        </li>
      </ul>
    </section>

    <section
      aria-label="What you are ordering"
      className="border-border bg-surface mt-6 rounded-xl border p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{listing.title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{listing.subtitle}</p>
        </div>
        <Badge variant="outline">{listing.gradeLabel}</Badge>
      </div>
      <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <Store className="size-4" aria-hidden="true" />
          Sold by <span className="text-foreground font-medium">{listing.sellerName}</span>
        </span>
        <span className="text-lg font-semibold">{listing.price}</span>
      </div>
      <p className="text-muted-foreground mt-3 text-sm">{listing.fulfillmentExpectations}</p>
    </section>

    <div className="mt-8">
      <PlaceOrderForm listingId={listing.listingId} listingHref={listing.listingHref} />
    </div>

    <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      Money only ever moves into escrow, released after you confirm delivery.
    </p>
  </Container>
);
