import { Container } from '../../../components/layout/container.tsx';
import { Skeleton } from '../../../components/ui/skeleton.tsx';

/** Listing page loading state (design spec): the real page's shape, hidden from assistive tech. */
const Loading = () => (
  <Container className="py-8">
    <p className="sr-only" role="status">
      Loading listing
    </p>
    <div aria-hidden="true">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-8 w-96 max-w-full" />
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex min-w-0 grow flex-col gap-8">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-lg" />
          ))}
        </div>
        <div className="w-full shrink-0 space-y-4 lg:w-80">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </Container>
);

export default Loading;
