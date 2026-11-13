'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { FormErrorBanner } from '../../../components/feedback/form-error-banner.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { type PlaceOrderFailure, placeOrderAction } from '../actions.ts';

/**
 * The one interactive piece of the confirmation page: submits exactly one placement and disables
 * itself while it runs (the double-submit guard, spec product risk). Success never returns — the
 * action redirects to the fresh order page, which is itself the confirmation (UC-001 B7).
 */
export const PlaceOrderForm = ({
  listingId,
  listingHref,
}: {
  readonly listingId: string;
  readonly listingHref: Route;
}) => {
  const [failure, setFailure] = useState<PlaceOrderFailure | null>(null);
  const [isPending, startTransition] = useTransition();

  if (failure?.kind === 'unavailable') {
    // The listing lost its last unit or stopped being sold while the buyer decided (UC-001
    // A3/A4): state it plainly and offer the ways on — no retry loop on a dead action.
    return (
      <div role="status" className="border-border bg-surface rounded-xl border p-5">
        <h2 className="font-semibold">This laptop is no longer available</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Every unit is reserved, sold, or the listing is no longer on sale. Units can return if a
          reservation lapses, so it may be worth checking the listing again later.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={listingHref}>Back to the listing</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/listings">Browse other laptops</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          setFailure(await placeOrderAction({ listingId }));
        });
      }}
      className="flex flex-col gap-3"
    >
      {failure !== null && <FormErrorBanner message={failure.message} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? 'Placing your order…' : 'Place order — pay later'}
        </Button>
        <Button asChild variant="secondary">
          <Link href={listingHref}>Keep looking</Link>
        </Button>
      </div>
    </form>
  );
};
