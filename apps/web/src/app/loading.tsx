import { Container } from '../components/layout/container.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';

/**
 * Route-level loading state. `aria-busy` with a visible label announces the wait once, rather
 * than leaving a screen-reader user with silence while skeletons shimmer.
 */
const Loading = () => (
  <Container className="py-16">
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-5 w-full max-w-prose" />
      <Skeleton className="h-5 w-2/3 max-w-prose" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  </Container>
);

export default Loading;
