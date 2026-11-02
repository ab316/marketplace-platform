'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Container } from '../../../components/layout/container.tsx';
import { cn } from '../../../lib/cn.ts';

/**
 * The seller area's sub-navigation: a tab row under the site header on every `/seller/*` page a
 * member sees (decided in the mockup round over a left rail). A Client Component only to read the
 * pathname for `aria-current`; it renders no data.
 *
 * Grows with the seller area — members and orders arrive with their slices — rather than each
 * slice adding its own landing page (design `seller-organization-setup.md`).
 */
const TABS: readonly { href: Route; label: string; exact: boolean }[] = [
  { href: '/seller', label: 'Overview', exact: true },
  { href: '/seller/listings', label: 'Listings', exact: false },
];

export const SellerNav = () => {
  const pathname = usePathname();

  return (
    <nav aria-label="Seller" className="border-border border-b">
      <Container className="flex items-center gap-1">
        {TABS.map(({ href, label, exact }) => {
          const current = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? 'page' : undefined}
              className={cn(
                '-mb-px border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                current
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              {label}
            </Link>
          );
        })}
      </Container>
    </nav>
  );
};
