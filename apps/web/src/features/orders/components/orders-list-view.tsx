import { ArrowRight, Package } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { EmptyState } from '../../../components/feedback/empty-state.tsx';
import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Button } from '../../../components/ui/button.tsx';
import type { OrderRowViewModel } from '../view-models.ts';

export interface OrdersListPageViewModel {
  readonly rows: readonly OrderRowViewModel[];
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
  /** First and last position shown, 1-based, for the "Showing x–y of z" line. */
  readonly from: number;
  readonly to: number;
}

const pageHref = (page: number): Route =>
  page <= 1 ? '/orders' : (`/orders?page=${String(page)}` as Route);

/**
 * The buyer's own orders, newest first, 12 per page (UC-014 O1/A1; spec D7/D9; design "Orders
 * list"). A plain list on purpose — grouping by what needs action is the Phase 5 buyer dashboard.
 * Synchronous and complete per ADR-013.
 */
export const OrdersListView = ({ list }: { readonly list: OrdersListPageViewModel }) => (
  <Container className="py-8">
    <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
    <p className="text-muted-foreground mt-1 text-sm">
      Newest first. Open an order to see its full story.
    </p>

    {list.total === 0 ? (
      <EmptyState
        className="mt-8"
        icon={Package}
        title="No orders yet"
        description="When you order a laptop it appears here, so you can pay it, follow it, or cancel it. Every laptop is refurbished, disclosed in full, and paid through escrow."
        action={
          <Button asChild variant="secondary">
            <Link href="/listings">Browse laptops</Link>
          </Button>
        }
      />
    ) : (
      <>
        <ul className="border-border bg-surface divide-border mt-6 divide-y rounded-xl border">
          {list.rows.map((row) => (
            <li key={row.id}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-5">
                <div className="min-w-56 flex-1">
                  <Link href={row.href} className="font-medium hover:underline">
                    {row.title}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    Placed {row.placed}
                    {row.note === null ? '' : ` · ${row.note}`}
                  </p>
                </div>
                <Badge variant={row.badge}>{row.statusLabel}</Badge>
                <span className="w-24 text-right font-medium">{row.price}</span>
                <Link
                  href={row.href}
                  aria-label={`View order: ${row.title}`}
                  className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  View
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>

        {list.pageCount > 1 && (
          <nav
            aria-label="Orders pages"
            className="text-muted-foreground mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
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
  </Container>
);
