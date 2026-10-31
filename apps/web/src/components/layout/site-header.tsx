import Link from 'next/link';

import { getCurrentActor } from '../../data/server/current-actor.ts';
import { signOutAction } from '../../features/auth/index.ts';
import { Logo } from '../brand/logo.tsx';
import { Button } from '../ui/button.tsx';
import { Container } from './container.tsx';
import { ThemeToggle } from './theme-toggle.tsx';

/**
 * Global page chrome. A Server Component: it fetches the current actor per request (never cached
 * across requests, ADR-011 §5), so a revoked session or role change shows on the next page load.
 * Only the theme toggle crosses the client boundary (REPO_MAP.md §5).
 *
 * Navigation is intentionally minimal. Real buyer/seller/operator navigation arrives with the
 * features that need it, not ahead of them.
 */
export const SiteHeader = async () => {
  const actor = await getCurrentActor();

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-sm">
      <Container>
        <div className="flex h-16 items-center justify-between gap-6">
          <Link href="/" aria-label="Acme Tech — home" className="rounded-md">
            <Logo size="sm" />
          </Link>

          <nav aria-label="Main" className="flex items-center gap-1">
            {actor === null ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">Create account</Link>
                </Button>
              </>
            ) : (
              <>
                <span className="text-muted-foreground hidden px-2 text-sm sm:inline">
                  {actor.displayName}
                </span>
                {/* A form so sign-out is a POST: revoking a session is a state change and must
                    never ride on a GET (ADR-011 — SameSite=Lax depends on it). */}
                <form action={signOutAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    Sign out
                  </Button>
                </form>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </Container>
    </header>
  );
};
