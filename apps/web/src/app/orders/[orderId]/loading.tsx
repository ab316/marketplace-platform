import { Container } from '../../../components/layout/container.tsx';
import { Skeleton } from '../../../components/ui/skeleton.tsx';

/** Order page loading state: the real page's shape, hidden from assistive tech. */
const Loading = () => (
  <Container className="py-8" width="wide">
    <p className="sr-only" role="status">
      Loading order
    </p>
    <div aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-32" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-10">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  </Container>
);

export default Loading;
