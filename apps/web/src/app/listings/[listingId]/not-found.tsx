import Link from 'next/link';

import { EmptyState } from '../../../components/feedback/empty-state.tsx';
import { Container } from '../../../components/layout/container.tsx';
import { Button } from '../../../components/ui/button.tsx';

/**
 * One answer for an unknown listing, a draft, and a deactivated seller's listing (UC-012 A5/E1):
 * a buyer learns nothing about which of the three it was.
 */
const NotFound = () => (
  <Container width="narrow" className="py-16">
    <h1 className="sr-only">Listing not available</h1>
    <EmptyState
      title="This listing is not available"
      description="It may have been removed, or the seller may no longer be selling on the marketplace."
      action={
        <Button asChild variant="secondary" size="sm">
          <Link href="/listings">Browse laptops</Link>
        </Button>
      }
    />
  </Container>
);

export default NotFound;
