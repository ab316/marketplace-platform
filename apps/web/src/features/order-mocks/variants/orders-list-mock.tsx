import { ArrowRight, Package } from 'lucide-react';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { FakeButton, OrderMockSwitcher } from '../components/order-mock-pieces.tsx';
import { formatSek, orderRows } from '../mock-data.ts';

/**
 * The `/orders` list (UC-014 O1/A1, spec D7/D9; design spec: `docs/design/buyer-ordering.md`):
 * the plain list, newest first, 12 per page — and underneath it the empty state, because a new
 * buyer's first visit must point at the catalogue, not at a blank page.
 *
 * The pagination row is staged as a buyer with more than one page would see it; the rows above it
 * are fewer so the exhibit stays readable.
 */

const OrderRowList = () => (
  <ul className="border-border bg-surface divide-border mt-6 divide-y rounded-xl border">
    {orderRows.map((row) => (
      <li key={row.title + row.placed}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-5">
          <div className="min-w-64 flex-1">
            <p className="font-medium">{row.title}</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Placed {row.placed}
              {row.note === undefined ? '' : ` · ${row.note}`}
            </p>
          </div>
          <Badge variant={row.badgeVariant}>{row.statusLabel}</Badge>
          <span className="w-24 text-right font-medium">{formatSek(row.amountMinor)}</span>
          <span className="text-primary inline-flex items-center gap-1 text-sm font-medium">
            View
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </li>
    ))}
  </ul>
);

const PaginationRow = () => (
  <div className="text-muted-foreground mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
    <span>Showing 1–12 of 19 orders</span>
    <div className="flex items-center gap-2">
      <FakeButton variant="secondary" className="h-8 px-3 text-sm opacity-50">
        Newer
      </FakeButton>
      <span>Page 1 of 2</span>
      <FakeButton variant="secondary" className="h-8 px-3 text-sm">
        Older
      </FakeButton>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="border-border bg-surface mt-6 rounded-xl border p-12 text-center">
    <Package className="text-muted-foreground mx-auto size-10" aria-hidden="true" />
    <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>
    <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
      When you order a laptop it appears here, so you can pay it, follow it, or cancel it. Every
      laptop on the marketplace is refurbished, disclosed in full, and paid through escrow.
    </p>
    <FakeButton className="mt-6">Browse laptops</FakeButton>
  </div>
);

export const OrdersListMock = () => (
  <>
    <OrderMockSwitcher current="/mocks/orders/list" />
    <Container className="py-12" width="default">
      <h1 className="text-3xl font-semibold tracking-tight">Your orders</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Newest first. Open an order to see its full story.
      </p>
      <OrderRowList />
      <PaginationRow />

      <div className="mt-16 max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight">The empty state (UC-014 A1)</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          What a buyer with no orders sees at the same route — a route forward, never a blank page.
        </p>
      </div>
      <EmptyState />
    </Container>
  </>
);
