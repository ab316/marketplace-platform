import { RotateCw } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { EmptyState } from '../../../components/feedback/empty-state.tsx';
import { Container } from '../../../components/layout/container.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { ApiTransportError } from '../../../data/api-error.ts';
import { getCurrentActor } from '../../../data/server/current-actor.ts';
import { getOrder } from '../../../data/server/orders.ts';
import { OrderDetailView, toOrderDetailViewModel } from '../../../features/orders/index.ts';

export const metadata: Metadata = { title: 'Your order' };

type PageProps = { readonly params: Promise<{ orderId: string }> };

/**
 * One order as its buyer follows it (UC-014 O2–O5; design "The order page"). A thin async shell
 * per ADR-013: resolve the id and the viewer, call the data layer, hand a view model to a
 * synchronous view. The backend decides visibility (buyer, selling organization, staff); this
 * page renders whatever it is allowed to read.
 */
const Page = async ({ params }: PageProps) => {
  const { orderId } = await params;

  if ((await getCurrentActor()) === null) {
    redirect(`/sign-in?next=${encodeURIComponent(`/orders/${orderId}`)}`);
  }

  let order;
  try {
    order = await getOrder(orderId);
  } catch (error) {
    if (error instanceof ApiTransportError) {
      // Recoverable and worded distinctly from "not available" (UC-014 E2).
      return <OrderUnavailable retryHref={`/orders/${encodeURIComponent(orderId)}` as Route} />;
    }
    throw error;
  }

  // One answer for an unknown id and someone else's order (UC-014 E1).
  if (order === null) {
    notFound();
  }

  return <OrderDetailView order={toOrderDetailViewModel(order)} />;
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
