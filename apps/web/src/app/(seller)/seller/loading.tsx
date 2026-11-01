import { Container } from '../../../components/layout/container.tsx';
import { Skeleton } from '../../../components/ui/skeleton.tsx';

/** Skeleton of the organization summary while the seller home fetches. */
const Loading = () => (
  <Container width="narrow" className="flex flex-col gap-6 py-16 sm:py-20">
    <p className="sr-only" role="status">
      Loading your organization
    </p>
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  </Container>
);

export default Loading;
