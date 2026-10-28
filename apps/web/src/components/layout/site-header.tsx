import Link from 'next/link';

import { Button } from '../ui/button.tsx';
import { Container } from './container.tsx';
import { ThemeToggle } from './theme-toggle.tsx';

/**
 * Global page chrome. A Server Component: only the theme toggle is interactive, so only it
 * crosses the client boundary (REPO_MAP.md §5).
 *
 * Navigation is intentionally minimal. Real buyer/seller/operator navigation arrives with the
 * features that need it, not ahead of them.
 */
export const SiteHeader = () => (
  <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-sm">
    <Container>
      <div className="flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-base font-semibold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md text-xs font-bold"
          >
            M
          </span>
          Marketplace
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/design-system">Design system</Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </Container>
  </header>
);
