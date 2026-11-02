import { Container } from '../../../../../components/layout/container.tsx';
import { Skeleton } from '../../../../../components/ui/skeleton.tsx';

/** Skeleton of the listing detail while it fetches. */
const Loading = () => (
  <Container className="flex flex-col gap-8 py-10">
    <p className="sr-only" role="status">
      Loading listing
    </p>
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-96 max-w-full" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  </Container>
);

export default Loading;
