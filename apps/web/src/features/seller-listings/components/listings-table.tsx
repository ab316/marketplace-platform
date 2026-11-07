import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '../../../components/ui/badge.tsx';
import { cn } from '../../../lib/cn.ts';
import type { SellerListingRow } from '../view-models.ts';

/**
 * The organization's listings (UC-010; design "Key components"). A real table, because sellers
 * compare status, price, and stock across rows (REPO_MAP.md §8). Synchronous and presentational.
 * Below `md` each row stacks, since there is no mobile design yet.
 */
export const ListingsTable = ({ rows }: { readonly rows: readonly SellerListingRow[] }) => (
  <table className="w-full border-collapse text-sm">
    <caption className="sr-only">Your organization&rsquo;s listings, newest first</caption>
    <thead className="text-muted-foreground hidden text-left text-xs md:table-header-group">
      <tr className="border-border border-b">
        <th scope="col" className="py-2 pr-4 font-medium">
          Listing
        </th>
        <th scope="col" className="py-2 pr-4 font-medium">
          Status
        </th>
        <th scope="col" className="py-2 pr-4 font-medium">
          Price
        </th>
        <th scope="col" className="py-2 pr-4 font-medium">
          Stock
        </th>
        <th scope="col" className="py-2 font-medium">
          Date
        </th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr
          key={row.id}
          className="border-border flex flex-col gap-1 border-b py-3 md:table-row md:py-0"
        >
          <td className="md:py-3 md:pr-4">
            <Link
              href={row.href}
              className={cn('font-medium hover:underline', row.untitled && 'italic')}
            >
              {row.title}
            </Link>
            {row.subtitle === null ? null : (
              <p className="text-muted-foreground text-xs">{row.subtitle}</p>
            )}
          </td>
          <td className="md:py-3 md:pr-4">
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge variant={row.status.variant}>{row.status.label}</Badge>
              {row.notInCatalogue ? <Badge variant="warning">Not in catalogue</Badge> : null}
            </span>
          </td>
          <td className="md:py-3 md:pr-4">{row.price}</td>
          <td className="md:py-3 md:pr-4">
            {row.ready && row.status.label === 'Draft' ? (
              <span className="text-success inline-flex items-center gap-1 font-medium">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {row.stockOrReadiness}
              </span>
            ) : (
              <span className={cn(row.status.label === 'Draft' && 'text-muted-foreground')}>
                {row.stockOrReadiness}
              </span>
            )}
          </td>
          <td className="text-muted-foreground md:py-3">{row.date}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
