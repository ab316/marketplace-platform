import type { SellerListingListResponse } from '@acme/api-contracts';
import { Laptop, Plus } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { EmptyState } from '../../../components/feedback/empty-state.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { toSellerListingRow } from '../view-models.ts';
import { ListingsTable } from './listings-table.tsx';

export interface SellerListingsViewProps {
  readonly page: SellerListingListResponse;
  readonly pageNumber: number;
  readonly pageSize: number;
  /** Owner or manager of an active organization (design: "Shared by every route"). */
  readonly canWrite: boolean;
}

const pageHref = (page: number): Route => `/seller/listings?page=${page}` as Route;

const NewListingButton = () => (
  <Button asChild>
    <Link href="/seller/listings/new">
      <Plus aria-hidden="true" />
      New listing
    </Link>
  </Button>
);

/**
 * The `/seller/listings` body (UC-010). Synchronous per ADR-013: the page shell fetches and
 * passes the response here, so every state is component-testable.
 */
export const SellerListingsView = ({
  page,
  pageNumber,
  pageSize,
  canWrite,
}: SellerListingsViewProps) => {
  const pageCount = Math.max(1, Math.ceil(page.total / pageSize));
  const countLabel = `${page.total} ${page.total === 1 ? 'listing' : 'listings'}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Listings</h1>
          {page.total > 0 ? <p className="text-muted-foreground text-sm">{countLabel}</p> : null}
        </div>
        {canWrite && page.total > 0 ? <NewListingButton /> : null}
      </div>

      {page.total === 0 ? (
        <EmptyState
          icon={Laptop}
          title="No listings yet"
          description={
            canWrite
              ? 'Start a draft. You can save it half-finished and publish when every detail is in.'
              : 'Owners and managers of your organization create listings.'
          }
          action={canWrite ? <NewListingButton /> : undefined}
        />
      ) : page.items.length === 0 ? (
        <EmptyState
          title="There's nothing on this page"
          description={`Your organization has ${countLabel}.`}
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href={pageHref(1)}>Back to the first page</Link>
            </Button>
          }
        />
      ) : (
        <ListingsTable rows={page.items.map(toSellerListingRow)} />
      )}

      {pageCount > 1 && page.items.length > 0 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {pageNumber > 1 ? (
            <Link href={pageHref(pageNumber - 1)} className="text-primary hover:underline">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {pageNumber} of {pageCount}
          </span>
          {pageNumber < pageCount ? (
            <Link href={pageHref(pageNumber + 1)} className="text-primary hover:underline">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
};
