import type { Listing, ListingListResponse } from '@acme/api-contracts';
import { Laptop, PackageOpen, Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '../../components/feedback/empty-state.tsx';
import { Container } from '../../components/layout/container.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { cn } from '../../lib/cn.ts';
import { GRADE_WORD } from '../../lib/formatting/listing.ts';
import { FilterRail } from './filter-rail.tsx';
import {
  type CatalogueSearch,
  FILTERS_FORM_ID,
  PAGE_SIZE,
  type SearchIssue,
  catalogueHref,
  clearAllHref,
  hasRefinements,
  refinementChips,
} from './search-params.ts';
import { SortSelect } from './sort-select.tsx';

/**
 * The catalogue page body (UC-006; design spec `docs/design/catalogue-search.md`).
 *
 * Synchronous and purely presentational per ADR-013: the async page shell fetches and hands the
 * result here, so every state below — results, zero results, empty marketplace, past-the-end —
 * is component-testable. Refinement changes are plain GET navigations (form submit or link), so
 * the page works without JavaScript and every search is shareable by construction.
 */

const GRADE_BADGE_VARIANT = { A: 'success', B: 'accent', C: 'warning' } as const;

export interface CatalogueViewProps {
  readonly search: CatalogueSearch;
  readonly issues: readonly SearchIssue[];
  readonly page: ListingListResponse;
}

const formatSek = (amountMinor: number): string =>
  new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);

const GradeLegend = () => (
  <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
    <span className="font-medium">Condition grades (cosmetic only):</span>
    {(['A', 'B', 'C'] as const).map((grade) => (
      <span key={grade} className="flex items-center gap-1.5">
        <Badge variant={GRADE_BADGE_VARIANT[grade]}>Grade {grade}</Badge>
        {GRADE_WORD[grade]}
      </span>
    ))}
  </p>
);

const IssueNotice = ({ issues }: { readonly issues: readonly SearchIssue[] }) => {
  if (issues.length === 0) {
    return null;
  }
  return (
    <div
      role="status"
      className="border-warning/35 bg-warning/10 mt-4 rounded-lg border px-4 py-3 text-sm"
    >
      <p className="font-medium">Part of the link could not be applied:</p>
      <ul className="mt-1 list-disc pl-5">
        {issues.map((issue) => (
          <li key={`${issue.param}:${issue.message}`}>
            <span className="font-mono text-xs">{issue.param}</span> — {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

const RefinementChips = ({ search }: { readonly search: CatalogueSearch }) => {
  const chips = refinementChips(search);
  if (chips.length === 0) {
    return null;
  }
  return (
    <ul aria-label="Active filters" className="flex list-none flex-wrap items-center gap-2 p-0">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link
            href={chip.removeHref}
            aria-label={chip.removeLabel}
            className="border-border bg-muted hover:bg-accent inline-flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-sm transition-colors"
          >
            {chip.label}
            <X className="text-muted-foreground size-3.5" aria-hidden="true" />
          </Link>
        </li>
      ))}
      <li>
        <Link href={clearAllHref(search)} className="text-primary text-sm hover:underline">
          Clear all
        </Link>
      </li>
    </ul>
  );
};

const ListingCard = ({ listing }: { readonly listing: Listing }) => (
  <li className="border-border bg-surface flex flex-col overflow-hidden rounded-xl border">
    <div
      aria-hidden="true"
      className="from-muted to-accent/50 text-muted-foreground grid h-36 place-items-center bg-gradient-to-br"
    >
      <Laptop className="size-10" />
    </div>
    <div className="flex grow flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm leading-snug font-semibold">{listing.title}</h3>
        <Badge variant={GRADE_BADGE_VARIANT[listing.condition.grade]} className="shrink-0">
          Grade {listing.condition.grade}
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        {listing.specifications.brand} {listing.specifications.model}
      </p>
      <p className="text-muted-foreground text-xs">
        {listing.specifications.cpu} · {listing.specifications.ramGb} GB RAM ·{' '}
        {listing.specifications.storageGb} GB {listing.specifications.storageType.toUpperCase()} ·{' '}
        {listing.specifications.screenSizeInches}&quot;
      </p>
      <p className="text-muted-foreground text-xs">
        Battery health ≥ {listing.condition.guarantees.batteryHealthMinPercent}%
      </p>
      <div className="mt-auto flex items-end justify-between pt-2">
        <p className="text-lg font-semibold">{formatSek(listing.price.amountMinor)}</p>
        <Badge variant="success">In stock</Badge>
      </div>
    </div>
  </li>
);

const Pagination = ({
  search,
  total,
}: {
  readonly search: CatalogueSearch;
  readonly total: number;
}) => {
  const pageCount = Math.ceil(total / PAGE_SIZE);
  if (pageCount <= 1) {
    return null;
  }
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav aria-label="Result pages" className="mt-8 flex items-center justify-center gap-1 text-sm">
      {search.page > 1 ? (
        <Link
          href={catalogueHref({ ...search, page: search.page - 1 })}
          className="hover:bg-muted rounded-md px-3 py-2"
        >
          Previous
        </Link>
      ) : null}
      {pages.map((page) => (
        <Link
          key={page}
          href={catalogueHref({ ...search, page })}
          aria-current={page === search.page ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-2',
            page === search.page
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-foreground'
          )}
        >
          {page}
        </Link>
      ))}
      {search.page < pageCount ? (
        <Link
          href={catalogueHref({ ...search, page: search.page + 1 })}
          className="hover:bg-muted rounded-md px-3 py-2"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
};

const Results = ({ search, page }: CatalogueViewProps) => {
  // The whole marketplace is empty — a different message from "your search missed" (design spec).
  if (page.total === 0 && !hasRefinements(search)) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="No laptops for sale right now"
        description="Sellers publish new stock continuously — check back soon."
      />
    );
  }

  // Nothing matches the active refinements (UC-006 A1/A2): never a bare empty grid.
  if (page.total === 0) {
    return (
      <div className="border-border rounded-xl border border-dashed px-6 py-14 text-center">
        <Search className="text-muted-foreground mx-auto size-7" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Nothing matches your search</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Every filter is still applied. Remove one below, or clear them all to see the whole
          catalogue.
        </p>
        <div className="mt-5 flex justify-center">
          <RefinementChips search={search} />
        </div>
        <Button asChild variant="secondary" className="mt-6">
          <Link href={clearAllHref(search)}>Clear all filters</Link>
        </Button>
      </div>
    );
  }

  // A stale or hand-edited link pointing past the last page (UC-006 A4).
  if (page.items.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No more results on this page"
        description={`Your search matches ${page.total} laptop${page.total === 1 ? '' : 's'}, but not this far in.`}
        action={
          <Button asChild variant="secondary">
            <Link href={catalogueHref({ ...search, page: 1 })}>Back to the first page</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-4">
        <GradeLegend />
      </div>
      <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {page.items.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </ul>
      <Pagination search={search} total={page.total} />
    </>
  );
};

export const CatalogueView = ({ search, issues, page }: CatalogueViewProps) => (
  <Container className="py-8" width="wide">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Refurbished laptops</h1>
        <p aria-live="polite" className="text-muted-foreground mt-1 text-sm">
          {page.total} laptop{page.total === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Part of the filter form via the `form` attribute, so keyword + filters submit as one
            GET even though the layout separates them. */}
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            form={FILTERS_FORM_ID}
            defaultValue={search.q ?? ''}
            maxLength={140}
            placeholder="Search laptops…"
            aria-label="Search laptops"
            className="w-56 pl-9"
          />
        </div>
        <SortSelect search={search} />
      </div>
    </div>

    <IssueNotice issues={issues} />

    {/* When nothing matched, the zero-results panel owns the chips; two copies would be noise. */}
    {page.total > 0 ? (
      <div className="mt-4">
        <RefinementChips search={search} />
      </div>
    ) : null}

    <div className="mt-6 flex flex-col gap-8 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-60">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Filters
        </h2>
        <FilterRail search={search} issues={issues} />
      </aside>

      <div className="min-w-0 grow">
        <Results search={search} issues={issues} page={page} />
      </div>
    </div>
  </Container>
);
