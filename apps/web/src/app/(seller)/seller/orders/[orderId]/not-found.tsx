import Link from 'next/link';

import { EmptyState } from '../../../../../components/feedback/empty-state.tsx';
import { Container } from '../../../../../components/layout/container.tsx';
import { Button } from '../../../../../components/ui/button.tsx';

/**
 * One answer for an unknown order id and another organization's order (UC-015 E1): a member
 * learns nothing about whether an order id exists elsewhere.
 */
const NotFound = () => (
  <Container width="narrow" className="py-16">
    <h1 className="sr-only">Order not available</h1>
    <EmptyState
      title="This order is not available"
      description="The link may be wrong, or the order may belong to a different organization."
      action={
        <Button asChild variant="secondary" size="sm">
          <Link href="/seller/orders">Orders</Link>
        </Button>
      }
    />
  </Container>
);

export default NotFound;
