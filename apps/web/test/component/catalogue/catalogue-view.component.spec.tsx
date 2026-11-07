import type { CatalogueListing, ListingListResponse } from '@acme/api-contracts';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CatalogueView } from '../../../src/features/catalogue/catalogue-view.tsx';
import { parseCatalogueSearchParams } from '../../../src/features/catalogue/search-params.ts';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn<(href: string) => void>() }),
}));

/**
 * Every user-visible state of the catalogue page body (design spec `catalogue-search.md`),
 * testable in Vitest because the view is synchronous per ADR-013: results with the grade legend,
 * zero results, the empty marketplace, a page past the end, and the bad-link notice.
 */

let nextId = 0;
const listing = (overrides: Partial<CatalogueListing> = {}): CatalogueListing => {
  nextId += 1;
  return {
    id: `lst_${nextId}`,
    organizationId: 'org_1',
    status: 'active',
    title: `ThinkPad T14 №${nextId}`,
    description: 'Business laptop, tested.',
    specifications: {
      brand: 'Lenovo',
      model: 'ThinkPad T14',
      cpu: 'Core i5-1245U',
      ramGb: 16,
      storageType: 'nvme',
      storageGb: 512,
      screenSizeInches: 14,
    },
    condition: {
      grade: 'B',
      guarantees: { batteryHealthMinPercent: 88 },
      knownDefects: 'none',
    },
    price: { amountMinor: 649_000, currency: 'SEK' },
    totalQuantity: 3,
    reservedQuantity: 0,
    soldQuantity: 0,
    availableQuantity: 3,
    fulfillmentExpectations: 'Ships in 2 days.',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    publishedAt: '2026-10-01T10:00:00.000Z',
    archivedAt: null,
    seller: { organizationId: 'org_1', name: 'Nordic Refurb AB' },
    ...overrides,
  };
};

const pageOf = (items: readonly CatalogueListing[], total = items.length): ListingListResponse => ({
  items: [...items],
  total,
  limit: 12,
  offset: 0,
});

const parsed = (params: Record<string, string | string[]>) => parseCatalogueSearchParams(params);

describe('CatalogueView — results', () => {
  it('shows the count, the grade legend, and one card per listing', () => {
    const { search, issues } = parsed({});
    render(<CatalogueView search={search} issues={issues} page={pageOf([listing(), listing()])} />);

    expect(screen.getByText('2 laptops')).toBeInTheDocument();
    expect(screen.getByText(/Condition grades \(cosmetic only\)/)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
    expect(screen.getAllByText('Grade B').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('6 490 kr').length).toBe(2);
  });

  it('names the seller on every card (UC-012)', () => {
    const { search, issues } = parsed({});
    render(
      <CatalogueView
        search={search}
        issues={issues}
        page={pageOf([listing({ seller: { organizationId: 'org_9', name: 'Baltic Devices' } })])}
      />
    );

    expect(screen.getByText('Sold by Baltic Devices')).toBeInTheDocument();
  });

  it('makes each card one link to its listing, carrying the search (UC-012; issue #15)', () => {
    const { search, issues } = parsed({ q: 'thinkpad', grade: 'B' });
    render(
      <CatalogueView
        search={search}
        issues={issues}
        page={pageOf([listing({ id: 'lst_42', title: 'ThinkPad T14 Gen 3' })])}
      />
    );

    const link = screen.getByRole('link', { name: 'ThinkPad T14 Gen 3' });
    expect(link).toHaveAttribute(
      'href',
      `/listings/lst_42?back=${encodeURIComponent('q=thinkpad&grade=B')}`
    );
  });

  it('renders a removable chip per active refinement and a clear-all link', () => {
    const { search, issues } = parsed({ brand: 'Lenovo', ramMin: '16' });
    render(<CatalogueView search={search} issues={issues} page={pageOf([listing()])} />);

    const removeBrand = screen.getByRole('link', { name: 'Remove filter: brand Lenovo' });
    expect(removeBrand).toHaveAttribute('href', expect.stringContaining('ramMin=16'));
    expect(removeBrand).toHaveAttribute('href', expect.not.stringContaining('brand='));
    expect(screen.getByRole('link', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('paginates with the current page marked for assistive tech', () => {
    const { search, issues } = parsed({ page: '2' });
    render(<CatalogueView search={search} issues={issues} page={pageOf([listing()], 30)} />);

    const nav = screen.getByRole('navigation', { name: 'Result pages' });
    expect(within(nav).getByText('2')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByText('Previous')).toHaveAttribute('href', '/listings');
    expect(within(nav).getByText('Next')).toHaveAttribute('href', '/listings?page=3');
  });
});

describe('CatalogueView — empty states', () => {
  it('distinguishes an empty marketplace from a missed search', () => {
    const noRefinements = parsed({});
    const { unmount } = render(
      <CatalogueView
        search={noRefinements.search}
        issues={noRefinements.issues}
        page={pageOf([])}
      />
    );
    expect(screen.getByText('No laptops for sale right now')).toBeInTheDocument();
    unmount();

    const refined = parsed({ brand: 'Apple', priceMax: '50' });
    render(<CatalogueView search={refined.search} issues={refined.issues} page={pageOf([])} />);
    expect(screen.getByText('Nothing matches your search')).toBeInTheDocument();
    // Recovery in one action: each chip is removable and everything can be cleared (UC-006 A1).
    expect(screen.getByRole('link', { name: 'Remove filter: brand Apple' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear all filters' })).toBeInTheDocument();
  });

  it('offers the way back from a page past the end of the results (A4)', () => {
    const { search, issues } = parsed({ page: '9' });
    render(<CatalogueView search={search} issues={issues} page={pageOf([], 3)} />);

    expect(screen.getByText(/matches 3 laptops, but not this far in/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the first page' })).toHaveAttribute(
      'href',
      '/listings'
    );
  });
});

describe('CatalogueView — bad links', () => {
  it('reports dropped refinements from a shared URL without losing the page (E1)', () => {
    const { search, issues } = parsed({ brand: 'Commodore', grade: 'B' });
    render(<CatalogueView search={search} issues={issues} page={pageOf([listing()])} />);

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Part of the link could not be applied');
    expect(notice).toHaveTextContent('"Commodore" is not a brand we list.');
    // The valid refinement survived.
    expect(screen.getByRole('link', { name: 'Remove filter: condition' })).toBeInTheDocument();
  });

  it('marks the offending price field with its reason (E1)', () => {
    const { search, issues } = parsed({ priceMin: '5000', priceMax: '100' });
    render(<CatalogueView search={search} issues={issues} page={pageOf([listing()])} />);

    const maxInput = screen.getByLabelText('Maximum price in SEK');
    expect(maxInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Max price must be at least the min price.')).toBeInTheDocument();
    // The valid bound stays applied.
    expect(screen.getByLabelText('Minimum price in SEK')).toHaveValue('5000');
  });
});
