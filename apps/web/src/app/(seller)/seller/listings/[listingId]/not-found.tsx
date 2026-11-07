import Link from 'next/link';

import { EmptyState } from '../../../../../components/feedback/empty-state.tsx';
import { Container } from '../../../../../components/layout/container.tsx';
import { Button } from '../../../../../components/ui/button.tsx';

/** A listing that does not exist, or belongs to another organization (design: one answer). */
const NotFound = () => (
  <Container width="narrow" className="py-16">
    <h1 className="sr-only">Listing not found</h1>
    <EmptyState
      title="We couldn't find that listing"
      description="It may have been removed, or it belongs to another organization."
      action={
        <Button asChild variant="secondary" size="sm">
          <Link href="/seller/listings">Back to your listings</Link>
        </Button>
      }
    />
  </Container>
);

export default NotFound;
