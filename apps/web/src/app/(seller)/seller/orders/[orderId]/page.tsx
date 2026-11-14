import { RotateCw } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EmptyState } from '../../../../../components/feedback/empty-state.tsx';
import { Container } from '../../../../../components/layout/container.tsx';
import { Button } from '../../../../../components/ui/button.tsx';
import { ApiTransportError } from '../../../../../data/api-error.ts';
import { getOrder } from '../../../../../data/server/orders.ts';
import { OrderDetailView, toOrderDetailViewModel } from '../../../../../features/orders/index.ts';
import {
  DeactivationBanner,
  StaffNotice,
} from '../../../../../features/seller-organization/index.ts';
import { resolveSellerAccess } from '../../_lib/seller-access.ts';

export const metadata: Metadata = { title: 'Order' };

type PageProps = { readonly params: Promise<{ orderId: string }> };

/**
 * One received order from the seller's side (UC-015 R2–R5; design `docs/design/seller-orders.md`).
 * Thin async shell per ADR-013. The backend decides who may read the order; this page additionally
 * shows only orders the member's own organization sold, so a member's personal purchase never
 * appears under `/seller` (UC-015 E1, spec edge cases).
 */
const Page = async ({ params }: PageProps) => {
  const { orderId } = await params;
  const path = `/seller/orders/${encodeURIComponent(orderId)}` as Route;

  const access = await resolveSellerAccess(path);
  if (access.kind === 'staff') {
    return (
      <Container width="narrow" className="py-16">
        <StaffNotice />
      </Container>
    );
  }

  let order;
  try {
    order = await getOrder(orderId);
  } catch (error) {
    if (error instanceof ApiTransportError) {
      return <OrderUnavailable retryHref={path} />;
    }
    throw error;
  }

  // One answer for an unknown id, another organization's order, and a member's own purchase.
  if (order === null || order.sellerOrganizationId !== access.membership.organizationId) {
    notFound();
  }

  return (
    <>
      {access.membership.organizationStatus === 'deactivated' ? (
        <Container className="pt-8">
          <DeactivationBanner />
        </Container>
      ) : null}
      <OrderDetailView order={toOrderDetailViewModel(order, 'seller')} />
    </>
  );
};

const OrderUnavailable = ({ retryHref }: { readonly retryHref: Route }) => (
  <Container className="py-16" width="narrow">
    <EmptyState
      icon={RotateCw}
      title="We could not load this order"
      description="Something went wrong on our side, not with the order itself. Trying again often works."
      action={
        <Button asChild variant="secondary">
          <Link href={retryHref}>Try again</Link>
        </Button>
      }
    />
  </Container>
);

export default Page;
