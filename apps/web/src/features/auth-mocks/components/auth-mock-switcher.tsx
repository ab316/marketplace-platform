import Link from 'next/link';

import { Container } from '../../../components/layout/container.tsx';
import { cn } from '../../../lib/cn.ts';
import { authMockPages } from '../mock-routes.ts';

/**
 * Sits at the top of every auth mockup so the directions can be flipped between without going
 * back to the gallery — same reasoning as the home-page `MockSwitcher`, which this mirrors.
 *
 * It also states plainly that the page is a mockup: nothing submits, no cookie is written.
 */
export const AuthMockSwitcher = ({ current }: { readonly current: string }) => (
  <div className="bg-muted/60 border-border border-b">
    <Container>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 text-sm">
        <span className="text-muted-foreground shrink-0">
          <Link href="/mocks/auth" className="text-foreground font-medium hover:underline">
            Auth mockups
          </Link>{' '}
          · static content, nothing submits
        </span>

        <nav aria-label="Auth-page mockups" className="flex flex-wrap items-center gap-1">
          {authMockPages.map((mock) => {
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
