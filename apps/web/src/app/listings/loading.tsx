import { Container } from '../../components/layout/container.tsx';
import { Skeleton } from '../../components/ui/skeleton.tsx';

/**
 * Catalogue loading state (design spec): a skeleton grid sized like the real one, hidden from
 * assistive tech while a visible-to-SR line announces the load.
 */
const Loading = () => (
  <Container className="py-8" width="wide">
    <p className="sr-only" role="status">
      Loading results
    </p>
    <div aria-hidden="true">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-24" />
      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="w-full shrink-0 space-y-3 lg:w-60">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
        <div className="grid min-w-0 grow grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </Container>
);

export default Loading;
