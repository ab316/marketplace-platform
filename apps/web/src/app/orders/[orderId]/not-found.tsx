import Link from 'next/link';

import { EmptyState } from '../../../components/feedback/empty-state.tsx';
import { Container } from '../../../components/layout/container.tsx';
import { Button } from '../../../components/ui/button.tsx';

/**
 * One answer for an unknown order id and someone else's order (UC-014 E1): a signed-in user
 * learns nothing about whether an order id exists.
 */
const NotFound = () => (
  <Container width="narrow" className="py-16">
    <h1 className="sr-only">Order not available</h1>
    <EmptyState
      title="This order is not available"
      description="The link may be wrong, or the order may belong to a different account."
      action={
        <Button asChild variant="secondary" size="sm">
          <Link href="/orders">Your orders</Link>
        </Button>
      }
    />
  </Container>
);

export default NotFound;
