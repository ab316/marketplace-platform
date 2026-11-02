import { Container } from '../../../../components/layout/container.tsx';
import { Skeleton } from '../../../../components/ui/skeleton.tsx';

/** Skeleton of the listing table while the list fetches. */
const Loading = () => (
  <Container className="flex flex-col gap-6 py-10">
    <p className="sr-only" role="status">
      Loading your listings
    </p>
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  </Container>
);

export default Loading;
