import { Inbox } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { EmptyState } from '../../../components/feedback/empty-state.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Button } from '../../../components/ui/button.tsx';
import type { SellerOrderRowViewModel } from '../view-models.ts';

export interface SellerOrdersPageViewModel {
  readonly rows: readonly SellerOrderRowViewModel[];
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
  /** First and last position shown, 1-based, for the "Showing x–y of z" line. */
  readonly from: number;
  readonly to: number;
}

const pageHref = (page: number): Route =>
  page <= 1 ? '/seller/orders' : (`/seller/orders?page=${String(page)}` as Route);

/**
 * The orders the organization received (UC-015 R1, A1; seller spec D1; design "Order row"): a
 * plain table, every status, newest first, 12 per page. Grouping by what needs attention is the
 * Phase 5 seller dashboard (P0-015). Identical for every member role (D2): there is nothing to
 * hide because there is nothing to do. Synchronous and complete per ADR-013.
 */
export const SellerOrdersView = ({ list }: { readonly list: SellerOrdersPageViewModel }) => {
  const countLabel = `${list.total} ${list.total === 1 ? 'order' : 'orders'}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        {list.total > 0 ? <p className="text-muted-foreground text-sm">{countLabel}</p> : null}
      </div>

      {list.total === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No orders yet"
          description="When a buyer orders one of your listings it shows up here, with who ordered and where the order stands."
          action={
            <Button asChild variant="secondary">
              <Link href="/seller/listings">Your listings</Link>
            </Button>
          }
        />
      ) : (
        <>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Orders your organization received, newest first</caption>
            <thead className="text-muted-foreground hidden text-left text-xs md:table-header-group">
              <tr className="border-border border-b">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Order
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Buyer
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Status
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Amount
                </th>
                <th scope="col" className="py-2 font-medium">
                  Placed
                </th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-border flex flex-col gap-1 border-b py-3 md:table-row md:py-0"
                >
                  <td className="md:py-3 md:pr-4">
                    <Link href={row.href} className="font-medium hover:underline">
                      {row.title}
                    </Link>
                    {row.note === null ? null : (
                      <p className="text-muted-foreground text-xs">{row.note}</p>
                    )}
                  </td>
                  <td className="md:py-3 md:pr-4">{row.buyerName}</td>
                  <td className="md:py-3 md:pr-4">
                    <Badge variant={row.badge}>{row.statusLabel}</Badge>
                  </td>
                  <td className="md:py-3 md:pr-4">{row.price}</td>
                  <td className="text-muted-foreground md:py-3">{row.placed}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {list.pageCount > 1 && (
            <nav
              aria-label="Orders pages"
              className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span>
                Showing {list.from}–{list.to} of {list.total} orders
              </span>
              <div className="flex items-center gap-2">
                {list.page > 1 ? (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={pageHref(list.page - 1)}>Newer</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled>
                    Newer
                  </Button>
                )}
                <span>
                  Page {list.page} of {list.pageCount}
                </span>
                {list.page < list.pageCount ? (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={pageHref(list.page + 1)}>Older</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled>
                    Older
                  </Button>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
};
