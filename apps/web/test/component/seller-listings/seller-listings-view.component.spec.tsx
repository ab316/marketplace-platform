import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ArchiveListingButton } from '../../../src/features/seller-listings/components/archive-listing-button.tsx';
import {
  PublishedListingView,
  ReadOnlyDraftView,
} from '../../../src/features/seller-listings/components/listing-view.tsx';
import { SellerListingsView } from '../../../src/features/seller-listings/components/seller-listings-view.tsx';
import { activeListing, emptyDraft } from '../../msw/listing-fixtures.ts';

const page = (
  items: Parameters<typeof SellerListingsView>[0]['page']['items'],
  total = items.length
) => ({
  items,
  total,
  limit: 20,
  offset: 0,
});

describe('SellerListingsView (UC-010)', () => {
  it('lists drafts with readiness and published listings with stock', () => {
    render(
      <SellerListingsView
        page={page([emptyDraft(), activeListing()])}
        pageNumber={1}
        pageSize={20}
        canWrite
      />
    );

    const table = screen.getByRole('table', { name: /listings/ });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    const rowAt = (index: number): HTMLElement => {
      const row = rows[index];
      if (row === undefined) {
        throw new Error(`No row ${index}`);
      }
      return row;
    };
    expect(within(rowAt(0)).getByRole('link', { name: 'Untitled draft' })).toHaveAttribute(
      'href',
      '/seller/listings/lst_draft'
    );
    expect(within(rowAt(0)).getByText('15 details missing')).toBeInTheDocument();
    expect(within(rowAt(1)).getByText('Active')).toBeInTheDocument();
    expect(within(rowAt(1)).getByText(/2 available · 1 reserved · 1 sold/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New listing' })).toBeInTheDocument();
  });

  it('invites an owner or manager to start when there is nothing yet', () => {
    render(<SellerListingsView page={page([])} pageNumber={1} pageSize={20} canWrite />);

    expect(screen.getByText('No listings yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New listing' })).toHaveAttribute(
      'href',
      '/seller/listings/new'
    );
  });

  it('offers a viewer no write action', () => {
    render(<SellerListingsView page={page([])} pageNumber={1} pageSize={20} canWrite={false} />);

    expect(
      screen.getByText(/Owners and managers of your organization create listings/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'New listing' })).not.toBeInTheDocument();
  });

  it('recovers from a page past the end', () => {
    render(<SellerListingsView page={page([], 3)} pageNumber={4} pageSize={20} canWrite />);

    expect(screen.getByText("There's nothing on this page")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the first page' })).toHaveAttribute(
      'href',
      '/seller/listings?page=1'
    );
  });
});

describe('listing pages (UC-009, UC-010)', () => {
  it('shows an active listing with its stock, notice, and archive control', () => {
    render(
      <PublishedListingView
        listing={activeListing()}
        notice={{ tone: 'success', text: 'Your listing is live.' }}
        archive={<ArchiveListingButton action={() => Promise.resolve({ formError: 'x' })} />}
      />
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Dell Latitude 5430 — refurbished' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Your listing is live.');
    expect(
      within(screen.getByRole('region', { name: 'Stock' })).getByText('Available')
    ).toBeInTheDocument();
    expect(screen.getByText('Grade B — Light wear')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive listing' })).toBeInTheDocument();
  });

  it('explains when an active listing is out of the catalogue', () => {
    render(
      <PublishedListingView
        listing={activeListing({ availableQuantity: 0, reservedQuantity: 0, soldQuantity: 4 })}
      />
    );

    expect(screen.getByText('Not in the catalogue: sold out.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive listing' })).not.toBeInTheDocument();
  });

  it('shows a draft read-only, with readiness but no publish control', () => {
    render(<ReadOnlyDraftView draft={emptyDraft()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Untitled draft' })).toBeInTheDocument();
    expect(screen.getAllByText('Not entered').length).toBeGreaterThan(0);
    expect(screen.getByText('15 details missing')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Title' })).not.toBeInTheDocument();
  });
});
