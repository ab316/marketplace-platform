import type { ListingListResponse } from '@acme/api-contracts';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ListingTable } from '../../../src/features/seller-listings/components/listing-table.tsx';
import { SELLER_LISTINGS_PAGE_SIZE } from '../../../src/features/seller-listings/paths.ts';
import { activeListing, archivedListing, makeListing } from '../../fixtures/listing.ts';

/**
 * The listing list's states (design contract `/seller/listings`): empty for a writer and for a
 * viewer, populated with every status, the sold-out flag, past the end, and pagination.
 */

const page = (items: ListingListResponse['items'], total = items.length): ListingListResponse => ({
  items,
  total,
  limit: SELLER_LISTINGS_PAGE_SIZE,
  offset: 0,
});

describe('ListingTable', () => {
  it('offers the first listing to a member who can write', () => {
    render(<ListingTable page={page([])} currentPage={1} canWrite organizationName="Nordic" />);

    expect(screen.getByText('No listings yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create your first listing/ })).toHaveAttribute(
      'href',
      '/seller/listings/new'
    );
  });

  it('shows the empty state without the action to a viewer', () => {
    render(
      <ListingTable page={page([])} currentPage={1} canWrite={false} organizationName="Nordic" />
    );

    expect(screen.getByText('No listings yet')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Create your first listing/ })
    ).not.toBeInTheDocument();
  });

  it('lists every status with stock, price, and a link to the detail page', () => {
    const draft = makeListing({ title: 'Draft one' });
    const active = activeListing({ title: 'Active one' });
    const archived = archivedListing({ title: 'Archived one' });
    render(
      <ListingTable
        page={page([draft, active, archived])}
        currentPage={1}
        canWrite
        organizationName="Nordic Refurb AB"
      />
    );

    const table = screen.getByRole('table', { name: 'Listings of Nordic Refurb AB' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    const row = (index: number): HTMLElement => {
      const element = rows[index];
      if (element === undefined) {
        throw new Error(`No row ${index}`);
      }
      return element;
    };

    expect(within(row(0)).getByRole('link', { name: 'Draft one' })).toHaveAttribute(
      'href',
      `/seller/listings/${draft.id}`
    );
    expect(within(row(0)).getByText('Draft')).toBeInTheDocument();
    expect(within(row(1)).getByText('Active')).toBeInTheDocument();
    expect(within(row(1)).getByText('7 of 12 available')).toBeInTheDocument();
    expect(within(row(1)).getByText(/2 reserved · 3 sold/)).toBeInTheDocument();
    expect(within(row(2)).getByText('Archived')).toBeInTheDocument();
    expect(within(row(0)).getByText(/7\s?490\s?kr/)).toBeInTheDocument();
    expect(screen.getByText(/3 listings/)).toBeInTheDocument();
  });

  it('flags a published listing with no available units as hidden from buyers (UC-006 Q1)', () => {
    const soldOut = activeListing({
      totalQuantity: 4,
      reservedQuantity: 1,
      soldQuantity: 3,
      availableQuantity: 0,
    });
    render(<ListingTable page={page([soldOut])} currentPage={1} canWrite organizationName="N" />);

    expect(screen.getByText('0 of 4 available')).toBeInTheDocument();
    expect(screen.getByText(/not shown to buyers/)).toBeInTheDocument();
  });

  it('does not flag a draft or an archived listing with no stock', () => {
    const draft = makeListing({ totalQuantity: 1, availableQuantity: 0, reservedQuantity: 1 });
    render(<ListingTable page={page([draft])} currentPage={1} canWrite organizationName="N" />);

    expect(screen.queryByText(/not shown to buyers/)).not.toBeInTheDocument();
  });

  it('explains a page past the end and links back to the first page', () => {
    render(<ListingTable page={page([], 45)} currentPage={9} canWrite organizationName="Nordic" />);

    expect(screen.getByText('There is nothing on this page')).toBeInTheDocument();
    expect(screen.getByText(/45 listings/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to first page' })).toHaveAttribute(
      'href',
      '/seller/listings'
    );
  });

  it('paginates with the current page marked', () => {
    render(
      <ListingTable
        page={page([makeListing()], SELLER_LISTINGS_PAGE_SIZE * 2 + 1)}
        currentPage={2}
        canWrite
        organizationName="Nordic"
      />
    );

    const nav = screen.getByRole('navigation', { name: 'Listing pages' });
    expect(within(nav).getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/seller/listings'
    );
    expect(within(nav).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/seller/listings?page=3'
    );
  });
});
