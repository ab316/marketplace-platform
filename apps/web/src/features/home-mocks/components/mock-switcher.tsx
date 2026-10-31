import Link from 'next/link';

import { Container } from '../../../components/layout/container.tsx';
import { cn } from '../../../lib/cn.ts';
import { mockRoutes } from '../mock-routes.ts';

/**
 * Sits at the top of every mockup so the directions can be flipped between without going back to
 * the gallery — comparing layouts is the entire point, and a two-click round trip is enough
 * friction to stop you doing it.
 *
 * It also states plainly that the page is a mockup. Mock pages that look production-ready have a
 * habit of being mistaken for progress.
 */
export const MockSwitcher = ({ current }: { readonly current: string }) => (
  <div className="bg-muted/60 border-border border-b">
    <Container>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 text-sm">
        <span className="text-muted-foreground shrink-0">
          <span className="text-foreground font-medium">Mockup</span> · static content, nothing is
          wired to the backend
        </span>

        <nav aria-label="Home-page mockups" className="flex flex-wrap items-center gap-1">
          {mockRoutes.map((mock) => {
            const isCurrent = mock.href === current;

            return (
              <Link
                key={mock.href}
                href={mock.href}
                // `aria-current` carries the state for screen readers; the weight and background
                // carry it visually. Neither is doing the job alone.
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors',
                  isCurrent
                    ? 'bg-surface text-foreground font-medium shadow-subtle'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface/70'
                )}
              >
                {mock.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </Container>
  </div>
);
