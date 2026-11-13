import { Container } from '../../components/layout/container.tsx';
import { Skeleton } from '../../components/ui/skeleton.tsx';

/** Orders list loading state: the real list's shape, hidden from assistive tech. */
const Loading = () => (
  <Container className="py-8">
    <p className="sr-only" role="status">
      Loading your orders
    </p>
    <div aria-hidden="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-6 flex flex-col gap-px">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className="h-20 w-full rounded-none first:rounded-t-xl last:rounded-b-xl"
          />
        ))}
      </div>
    </div>
  </Container>
);

export default Loading;
