import { Container } from '../../../../../components/layout/container.tsx';
import { Skeleton } from '../../../../../components/ui/skeleton.tsx';

/** Skeleton while a listing loads. */
const Loading = () => (
  <Container className="flex flex-col gap-6 pt-8 pb-16">
    <p className="sr-only" role="status">
      Loading listing
    </p>
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  </Container>
);

export default Loading;
