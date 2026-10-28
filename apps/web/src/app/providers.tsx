'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { ThemeProvider } from '../components/layout/theme-provider.tsx';

/**
 * Reads an HTTP status off an unknown rejection without asserting a shape. Errors crossing into
 * TanStack Query are typed `Error`, but ours carry a `status` (see `src/data/api-error.ts`).
 */
const statusOf = (error: unknown): number | undefined => {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
};

/**
 * The single client-side provider boundary (ADR-010).
 *
 * TanStack Query covers client-side refetching and mutations only; initial page data is loaded
 * by Server Components through `src/data/`. `nuqs` backs URL state for filters and pagination,
 * which keeps those views shareable and crawlable.
 */
export const Providers = ({ children }: { children: ReactNode }) => {
  // Created in state, not at module scope: a module-level client would be shared across all
  // users on the server and leak one request's data into another's cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The window regaining focus is not evidence that marketplace data changed.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            // 4xx answers are deterministic; only retry what might differ next time.
            retry: (failureCount, error) => {
              const status = statusOf(error);
              if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
};
