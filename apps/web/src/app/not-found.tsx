import Link from 'next/link';

import { Container } from '../components/layout/container.tsx';
import { Button } from '../components/ui/button.tsx';

const NotFound = () => (
  <Container width="narrow" className="py-24">
    <div className="flex flex-col items-start gap-4">
      <p className="text-muted-foreground font-mono text-sm">404</p>
      <h1 className="text-2xl font-semibold">We could not find that page</h1>
      <p className="text-muted-foreground">
        The link may be out of date, or the page may have moved.
      </p>
      <Button asChild variant="secondary">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  </Container>
);

export default NotFound;
