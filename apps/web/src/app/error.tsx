'use client';

import { useEffect } from 'react';

import { Container } from '../components/layout/container.tsx';
import { Button } from '../components/ui/button.tsx';

/**
 * Route-level error boundary. Must be a Client Component — React needs a client boundary to
 * catch a render error and offer recovery.
 *
 * The user is never shown `error.message`: it can carry internal detail (REPO_MAP.md §9). The
 * `digest` is safe to display and is what correlates this screen with the server log entry.
 */
const ErrorBoundary = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    // Replace with the normalized client error reporter when telemetry lands (REPO_MAP.md §10).
    // eslint-disable-next-line no-console -- no reporting pipeline exists yet; losing the error entirely is worse
    console.error(error);
  }, [error]);

  return (
    <Container width="narrow" className="py-24">
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          We could not load this page. The problem has been recorded — trying again often works.
        </p>
        {error.digest !== undefined ? (
          <p className="text-muted-foreground font-mono text-xs">Reference: {error.digest}</p>
        ) : null}
        <Button onClick={reset}>Try again</Button>
      </div>
    </Container>
  );
};

export default ErrorBoundary;
