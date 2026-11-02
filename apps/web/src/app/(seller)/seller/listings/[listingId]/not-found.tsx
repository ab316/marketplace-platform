import Link from 'next/link';

import { Container } from '../../../../../components/layout/container.tsx';
import { Button } from '../../../../../components/ui/button.tsx';

/** A listing this member cannot manage: unknown id, or another organization's (UC-007 E2). */
const NotFound = () => (
  <Container width="narrow" className="py-24">
    <div className="flex flex-col items-start gap-4">
      <p className="text-muted-foreground font-mono text-sm">404</p>
      <h1 className="text-2xl font-semibold">We could not find that listing</h1>
      <p className="text-muted-foreground">
        It may have been removed, or it belongs to another organization.
      </p>
      <Button asChild variant="secondary">
        <Link href="/seller/listings">Back to your listings</Link>
      </Button>
    </div>
  </Container>
);

export default NotFound;
