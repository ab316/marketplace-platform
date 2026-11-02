import type { Listing, ListingListResponse } from '@acme/api-contracts';
import { Laptop, Plus } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '../../../components/feedback/empty-state.tsx';
import { Button } from '../../../components/ui/button.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table.tsx';
import { cn } from '../../../lib/cn.ts';
import { formatMediumDate } from '../../../lib/formatting/date.ts';
import { formatSek } from '../../../lib/formatting/money.ts';
import {
  SELLER_LISTINGS_PAGE_SIZE,
  listingDetailHref,
  newListingHref,
  sellerListingsHref,
} from '../paths.ts';
import { ListingStatusBadge } from './listing-status-badge.tsx';

/**
 * The organization's listings in every status (UC-007 S5; design contract `/seller/listings`).
 * Synchronous and presentational per ADR-013: the page shell fetches and passes the response, so
 * the empty, populated, and past-the-end states are all component-testable.
 */
export interface ListingTableProps {
  readonly page: ListingListResponse;
  readonly currentPage: number;
  readonly canWrite: boolean;
  readonly organizationName: string;
}

/**
 * Stock in one cell: available is the number that matters day to day; reserved and sold sit under
 * it. A published listing with nothing available is flagged, because the catalogue hides it
 * (UC-006 Q1) and the seller should know why it has gone quiet.
 */
const StockCell = ({ listing }: { listing: Listing }) => {
  const soldOut = listing.status === 'active' && listing.availableQuantity === 0;
  return (
    <div className="flex flex-col">
      <span className={cn('tabular-nums', soldOut && 'text-warning-foreground dark:text-warning')}>
        {listing.availableQuantity} of {listing.totalQuantity} available
      </span>
      <span className="text-muted-foreground text-xs tabular-nums">
        {listing.reservedQuantity} reserved · {listing.soldQuantity} sold
        {soldOut ? ' · not shown to buyers' : ''}
      </span>
    </div>
  );
};

const Pagination = ({ currentPage, total }: { currentPage: number; total: number }) => {
  const pageCount = Math.ceil(total / SELLER_LISTINGS_PAGE_SIZE);
  if (pageCount <= 1) {
    return null;
  }
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav aria-label="Listing pages" className="flex items-center justify-center gap-1 text-sm">
      {currentPage > 1 ? (
        <Link
          href={sellerListingsHref(currentPage - 1)}
          className="hover:bg-muted rounded-md px-3 py-2"
        >
          Previous
        </Link>
      ) : null}
      {pages.map((page) => (
        <Link
          key={page}
          href={sellerListingsHref(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-2',
            page === currentPage
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-foreground'
          )}
        >
          {page}
        </Link>
      ))}
      {currentPage < pageCount ? (
        <Link
          href={sellerListingsHref(currentPage + 1)}
          className="hover:bg-muted rounded-md px-3 py-2"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
};

export const ListingTable = ({
  page,
  currentPage,
  canWrite,
  organizationName,
}: ListingTableProps) => {
  if (page.total === 0) {
    return (
      <EmptyState
        icon={Laptop}
        title="No listings yet"
        description="Your first listing starts as a draft only you can see. Publish it when every detail is in, and buyers can find it in the catalogue within seconds."
        action={
          canWrite ? (
            <Button asChild>
              <Link href={newListingHref()}>
                <Plus aria-hidden="true" /> Create your first listing
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (page.items.length === 0) {
    return (
      <EmptyState
        title="There is nothing on this page"
        description={`Your organization has ${page.total} listing${page.total === 1 ? '' : 's'}; this page is past the last one.`}
        action={
          <Button asChild variant="secondary">
            <Link href={sellerListingsHref()}>Back to first page</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        {page.total} listing{page.total === 1 ? '' : 's'} · drafts, published, and archived
        together. Buyers see only published listings with stock.
      </p>

      <Table>
        <caption className="sr-only">Listings of {organizationName}</caption>
        <TableHeader>
          <tr>
            <TableHead>Listing</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Updated</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {page.items.map((listing) => (
            <TableRow key={listing.id}>
              <TableCell>
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="from-muted to-accent/50 text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br"
                  >
                    <Laptop className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={listingDetailHref(listing.id)}
                      className="text-primary block truncate font-medium hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {listing.specifications.brand} {listing.specifications.model} · Grade{' '}
                      {listing.condition.grade}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <ListingStatusBadge status={listing.status} />
              </TableCell>
              <TableCell>
                <StockCell listing={listing} />
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatSek(listing.price.amountMinor)}
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {formatMediumDate(listing.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination currentPage={currentPage} total={page.total} />
    </div>
  );
};
