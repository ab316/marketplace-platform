import { Laptop, Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';

import { Container } from '../../components/layout/container.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import { cn } from '../../lib/cn.ts';
import {
  BRAND_OPTIONS,
  GRADE_WORD,
  filteredListings,
  formatSek,
  listings,
  type MockGrade,
  type MockListing,
} from './mock-data.ts';
import { catalogueMockPages, type CatalogueMockState } from './mock-routes.ts';

/**
 * Catalogue-search mockups for UC-006 (design spec: `docs/design/catalogue-search.md`).
 *
 * Presentational only: every control is decorative, no state, no handlers, no JavaScript shipped.
 * The point is layout, density, copy, and the three states the implementation must handle —
 * default results, active refinements, zero results — rendered with data varied enough to be
 * honest about how the grid behaves.
 */

/** Chips staged for the filtered and empty states; mirrors the URL the real page would carry. */
const ACTIVE_CHIPS: Record<CatalogueMockState, readonly string[]> = {
  results: [],
  filtered: [
    'Brand: Lenovo',
    'Brand: Dell',
    'Memory: 16 GB+',
    'Condition: B or better',
    'Max 12 000 kr',
  ],
  empty: ['Search: "gaming thinkpad"', 'Brand: Apple', 'Memory: 64 GB+', 'Max 5 000 kr'],
};

/** How many brands the rail shows before the "show all" disclosure. */
const VISIBLE_BRANDS = 6;

const GRADE_BADGE_VARIANT: Record<MockGrade, 'success' | 'accent' | 'warning'> = {
  A: 'success',
  B: 'accent',
  C: 'warning',
};

/**
 * What the grade letters on the cards mean, stated once above the grid.
 *
 * The cards carry the letter alone to keep the badge on one line; without this legend the letter
 * would be an unexplained code, and colour would be doing the explaining on its own (REPO_MAP §8).
 */
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

const StateSwitcher = ({ current }: { current: CatalogueMockState }) => (
  <div className="border-border bg-muted/40 border-b">
    <Container className="flex flex-wrap items-center gap-2 py-2 text-sm" width="wide">
      <span className="text-muted-foreground mr-2">
        <Link href="/mocks" className="text-foreground font-medium hover:underline">
          Mockups
        </Link>{' '}
        · UC-006 catalogue search, static content. State:
      </span>
      {catalogueMockPages.map(({ state, href, name }) => (
        <Link
          key={state}
          href={href}
          aria-current={state === current ? 'page' : undefined}
          className={cn(
            'rounded-md px-2.5 py-1',
            state === current
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          )}
        >
          {name}
        </Link>
      ))}
    </Container>
  </div>
);

/** A decorative stand-in control: looks like the real thing, does nothing, announces nothing. */
const FakeControl = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    aria-hidden="true"
    className={cn(
      'border-input bg-surface text-foreground flex h-10 items-center rounded-lg border px-3 text-sm',
      className
    )}
  >
    {children}
  </div>
);

const FakeCheckbox = ({ label, checked = false }: { label: string; checked?: boolean }) => (
  <div aria-hidden="true" className="flex items-center gap-2 py-1 text-sm">
    <span
      className={cn(
        'grid size-4 place-items-center rounded border',
        checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-surface'
      )}
    >
      {checked ? '✓' : null}
    </span>
    {label}
  </div>
);

const FakeRadio = ({ label, checked = false }: { label: string; checked?: boolean }) => (
  <div aria-hidden="true" className="flex items-center gap-2 py-1 text-sm">
    <span
      className={cn(
        'grid size-4 place-items-center rounded-full border',
        checked ? 'border-primary' : 'border-input'
      )}
    >
      {checked ? <span className="bg-primary size-2 rounded-full" /> : null}
    </span>
    {label}
  </div>
);

const FilterRail = ({ state }: { state: CatalogueMockState }) => {
  const filtered = state === 'filtered';
  const empty = state === 'empty';

  return (
    <aside className="w-full shrink-0 lg:w-60">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Filters
        </h2>
        <span className="text-primary text-sm">Clear all</span>
      </div>

      <section className="border-border mt-4 border-t pt-4">
        <h3 className="text-sm font-medium">Brand</h3>
        {/*
          The curated list runs to 14 brands, which is longer than the rail should show at rest.
          The common six stay visible and the rest hide behind a disclosure — the pattern every
          catalogue of this shape settles on, and the reason the design spec calls for it.
        */}
        <div className="mt-2">
          {BRAND_OPTIONS.slice(0, VISIBLE_BRANDS).map((brand) => (
            <FakeCheckbox
              key={brand}
              label={brand}
              checked={
                (filtered && (brand === 'Lenovo' || brand === 'Dell')) ||
                (empty && brand === 'Apple')
              }
            />
          ))}
        </div>
        <span className="text-primary mt-1 inline-block text-sm">
          Show all {BRAND_OPTIONS.length} brands
        </span>
      </section>

      <section className="border-border mt-4 border-t pt-4">
        <h3 className="text-sm font-medium">Price (SEK)</h3>
        <div className="mt-2 flex items-center gap-2">
          <FakeControl className="text-muted-foreground w-full">Min</FakeControl>
          <FakeControl className={cn('w-full', !filtered && !empty && 'text-muted-foreground')}>
            {filtered ? '12 000' : empty ? '5 000' : 'Max'}
          </FakeControl>
        </div>
      </section>

      <section className="border-border mt-4 border-t pt-4">
        <h3 className="text-sm font-medium">Condition</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Grades describe cosmetic condition. Picking one includes better grades.
        </p>
        <div className="mt-2">
          <FakeRadio label="A — like new" />
          <FakeRadio label="B or better" checked={filtered} />
          <FakeRadio label="C or better" />
          <FakeRadio label="Any condition" checked={!filtered} />
        </div>
      </section>

      <section className="border-border mt-4 border-t pt-4">
        <h3 className="text-sm font-medium">Memory</h3>
        <div className="mt-2">
          <FakeRadio label="8 GB or more" />
          <FakeRadio label="16 GB or more" checked={filtered} />
          <FakeRadio label="32 GB or more" />
          <FakeRadio label="64 GB or more" checked={empty} />
          <FakeRadio label="Any amount" checked={!filtered && !empty} />
        </div>
      </section>

      <Button className="mt-5 w-full" aria-hidden="true" tabIndex={-1}>
        Apply filters
      </Button>
    </aside>
  );
};

const RefinementChips = ({ chips }: { chips: readonly string[] }) => (
  <div className="flex flex-wrap items-center gap-2">
    {chips.map((chip) => (
      <span
        key={chip}
        className="border-border bg-muted inline-flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-sm"
      >
        {chip}
        <X className="text-muted-foreground size-3.5" aria-hidden="true" />
      </span>
    ))}
    <span className="text-primary text-sm">Clear all</span>
  </div>
);

const ListingCard = ({ listing }: { listing: MockListing }) => (
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
        {/*
          Grade letter only. The plain-language word ("Like new") wrapped the badge onto two lines
          and unbalanced every card; the legend above the grid carries the meaning instead, and
          the listing detail page spells each grade out in full.
        */}
        <Badge variant={GRADE_BADGE_VARIANT[listing.grade]} className="shrink-0">
          Grade {listing.grade}
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        {listing.brand} {listing.model}
      </p>
      <p className="text-muted-foreground text-xs">
        {listing.cpu} · {listing.ramGb} GB RAM · {listing.storage} · {listing.screenSizeInches}
        &quot;
      </p>
      <p className="text-muted-foreground text-xs">
        Battery health ≥ {listing.batteryHealthMinPercent}%
      </p>
      <div className="mt-auto flex items-end justify-between pt-2">
        <div>
          <p className="text-lg font-semibold">{formatSek(listing.priceMinor)}</p>
          <p className="text-muted-foreground text-xs">Sold by {listing.sellerName}</p>
        </div>
        <Badge variant="success">In stock</Badge>
      </div>
    </div>
  </li>
);

const ZeroResults = ({ chips }: { chips: readonly string[] }) => (
  <div className="border-border rounded-xl border border-dashed px-6 py-16 text-center">
    <Search className="text-muted-foreground mx-auto size-8" aria-hidden="true" />
    <h2 className="mt-4 text-lg font-semibold">Nothing matches your search</h2>
    <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
      Every filter below is still applied. Remove one — the price ceiling or the memory floor are
      the usual suspects — or clear them all to see the whole catalogue.
    </p>
    <div className="mt-5 flex justify-center">
      <RefinementChips chips={chips} />
    </div>
    <Button variant="secondary" className="mt-6" aria-hidden="true" tabIndex={-1}>
      Clear all filters
    </Button>
  </div>
);

const Pagination = () => (
  <nav aria-hidden="true" className="mt-8 flex items-center justify-center gap-1 text-sm">
    <span className="text-muted-foreground px-3 py-2">Previous</span>
    <span className="bg-primary text-primary-foreground rounded-md px-3 py-2">1</span>
    <span className="hover:bg-muted rounded-md px-3 py-2">2</span>
    <span className="hover:bg-muted rounded-md px-3 py-2">3</span>
    <span className="hover:bg-muted rounded-md px-3 py-2">Next</span>
  </nav>
);

export const CatalogueMock = ({ state }: { state: CatalogueMockState }) => {
  const rows = state === 'results' ? listings : state === 'filtered' ? filteredListings : [];
  const chips = ACTIVE_CHIPS[state];

  return (
    <>
      <StateSwitcher current={state} />

      <Container className="py-8" width="wide">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Refurbished laptops</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {state === 'empty'
                ? '0 laptops match'
                : `${rows.length} laptop${rows.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <FakeControl className="text-muted-foreground w-56 justify-between">
              <span className="flex items-center gap-2">
                <Search className="size-4" />
                {state === 'empty' ? '"gaming thinkpad"' : 'Search laptops…'}
              </span>
            </FakeControl>
            <FakeControl className="w-44 justify-between">
              {state === 'filtered' ? 'Price: low to high' : 'Newest first'}
              <span className="text-muted-foreground">▾</span>
            </FakeControl>
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="mt-4">
            <RefinementChips chips={chips} />
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          <FilterRail state={state} />

          <div className="min-w-0 grow">
            {state === 'empty' ? (
              <ZeroResults chips={chips} />
            ) : (
              <>
                <div className="mb-4">
                  <GradeLegend />
                </div>
                <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                  {rows.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </ul>
                {state === 'results' ? <Pagination /> : null}
              </>
            )}
          </div>
        </div>
      </Container>
    </>
  );
};
