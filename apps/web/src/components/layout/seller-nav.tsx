'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '../../lib/cn.ts';

const LINKS: readonly { readonly href: Route; readonly label: string; readonly exact: boolean }[] =
  [
    { href: '/seller', label: 'Overview', exact: true },
    { href: '/seller/listings', label: 'Listings', exact: false },
  ];

/**
 * The seller area's sub-navigation (design: seller listing management, "Route & entry points").
 * Rendered by the `/seller` layout for members only; the members slice adds "Team".
 */
export const SellerNav = () => {
  const pathname = usePathname();
  return (
    <nav aria-label="Seller" className="border-border border-b">
      <ul className="flex gap-6 text-sm">
        {LINKS.map((link) => {
          const current = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  '-mb-px inline-block border-b-2 py-3 font-medium transition-colors',
                  current
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
