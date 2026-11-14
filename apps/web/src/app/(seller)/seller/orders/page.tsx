import { RotateCw } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '../../../../components/feedback/empty-state.tsx';
import { Container } from '../../../../components/layout/container.tsx';
import { Button } from '../../../../components/ui/button.tsx';
import { ApiTransportError } from '../../../../data/api-error.ts';
import { ORDERS_PAGE_SIZE, listOrganizationOrders } from '../../../../data/server/orders.ts';
import { SellerOrdersView, toSellerOrderRowViewModel } from '../../../../features/orders/index.ts';
import { DeactivationBanner, StaffNotice } from '../../../../features/seller-organization/index.ts';
import { resolveSellerAccess } from '../_lib/seller-access.ts';

export const metadata: Metadata = {
  title: 'Orders',
  description: 'The orders your organization received on Acme Tech.',
};

const parsePage = (raw: string | string[] | undefined): number => {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isSafeInteger(value) && value >= 1 ? value : 1;
};

const pageHref = (page: number): Route =>
  page <= 1 ? '/seller/orders' : (`/seller/orders?page=${String(page)}` as Route);

/**
 * The orders the organization received (UC-015 R1; design `docs/design/seller-orders.md`). Thin
 * async shell per ADR-013: resolve the member, the page, call the data layer, hand view models
 * to a synchronous view.
 */
const Page = async ({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const access = await resolveSellerAccess('/seller/orders');
  if (access.kind === 'staff') {
    return (
      <Container width="narrow" className="py-16">
        <StaffNotice />
      </Container>
    );
  }

  const page = parsePage((await searchParams)['page']);

  let response;
  try {
    response = await listOrganizationOrders(page);
  } catch (error) {
    if (error instanceof ApiTransportError) {
      // Never shown as "no orders": the failure is recoverable and says so (UC-015 E3).
      return <OrdersUnavailable retryHref={pageHref(page)} />;
    }
    throw error;
  }

  const pageCount = Math.max(1, Math.ceil(response.total / ORDERS_PAGE_SIZE));
  if (page > pageCount) {
    redirect('/seller/orders');
  }

  return (
    <Container className="flex flex-col gap-6 pt-8 pb-16">
      {access.membership.organizationStatus === 'deactivated' ? <DeactivationBanner /> : null}
      <SellerOrdersView
        list={{
          rows: response.items.map(toSellerOrderRowViewModel),
          total: response.total,
          page,
          pageCount,
          from: response.offset + 1,
          to: response.offset + response.items.length,
        }}
      />
    </Container>
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
