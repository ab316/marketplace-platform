import { RotateCw } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '../../components/feedback/empty-state.tsx';
import { Container } from '../../components/layout/container.tsx';
import { Button } from '../../components/ui/button.tsx';
import { ApiTransportError } from '../../data/api-error.ts';
import { getCurrentActor } from '../../data/server/current-actor.ts';
import { ORDERS_PAGE_SIZE, listBuyerOrders } from '../../data/server/orders.ts';
import { OrdersListView, toOrderRowViewModel } from '../../features/orders/index.ts';

export const metadata: Metadata = { title: 'Your orders' };

type PageProps = { readonly searchParams: Promise<{ page?: string | string[] }> };

const parsePage = (value: string | string[] | undefined): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : 1;
};

/**
 * The buyer's own orders (UC-014 O1; design "Orders list"). A thin async shell per ADR-013:
 * resolve the viewer and the page, call the data layer, hand view models to a synchronous view.
 */
const Page = async ({ searchParams }: PageProps) => {
  if ((await getCurrentActor()) === null) {
    redirect('/sign-in?next=/orders');
  }

  const page = parsePage((await searchParams).page);

  let response;
  try {
    response = await listBuyerOrders(page);
  } catch (error) {
    if (error instanceof ApiTransportError) {
      // Never shown as "no orders": the failure is recoverable and says so (UC-014 E2).
      return (
        <OrdersUnavailable
          retryHref={page <= 1 ? '/orders' : (`/orders?page=${String(page)}` as Route)}
        />
      );
    }
    throw error;
  }

  const pageCount = Math.max(1, Math.ceil(response.total / ORDERS_PAGE_SIZE));

  // Paging past the end states the truth and the way back rather than a bare empty list.
  if (page > pageCount) {
    redirect('/orders');
  }

  return (
    <OrdersListView
      list={{
        rows: response.items.map(toOrderRowViewModel),
        total: response.total,
        page,
        pageCount,
        from: response.offset + 1,
        to: response.offset + response.items.length,
      }}
    />
  );
};

const OrdersUnavailable = ({ retryHref }: { readonly retryHref: Route }) => (
  <Container className="py-16" width="narrow">
    <EmptyState
      icon={RotateCw}
      title="We could not load your orders"
      description="Something went wrong on our side — this is not the same as having no orders. Trying again often works."
      action={
        <Button asChild variant="secondary">
          <Link href={retryHref}>Try again</Link>
        </Button>
      }
    />
  </Container>
);

export default Page;
