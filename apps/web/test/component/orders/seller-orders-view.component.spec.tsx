import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  type SellerOrdersPageViewModel,
  SellerOrdersView,
} from '../../../src/features/orders/components/seller-orders-view.tsx';
import { toSellerOrderRowViewModel } from '../../../src/features/orders/view-models.ts';
import { order } from '../../unit/orders/order-view-models.unit.spec.ts';

/**
 * The /seller/orders table (UC-015 R1, A1; seller spec D1): rows with the buyer named, paging,
 * and the empty state that points at the listings.
 */

const list = (overrides: Partial<SellerOrdersPageViewModel> = {}): SellerOrdersPageViewModel => ({
  rows: [
    toSellerOrderRowViewModel(order()),
    toSellerOrderRowViewModel(
      order({
        id: 'ord_2',
        buyerUserId: 'usr_dave',
        buyer: { userId: 'usr_dave', displayName: 'Dave Olsson' },
        status: 'cancelled',
        cancellationReason: 'expired',
      })
    ),
  ],
  total: 2,
  page: 1,
  pageCount: 1,
  from: 1,
  to: 2,
  ...overrides,
});

describe('SellerOrdersView', () => {
  it('lists received orders with the buyer, status, amount, and a link each', () => {
    render(<SellerOrdersView list={list()} />);

    const table = screen.getByRole('table', { name: /orders your organization received/i });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(table).getAllByRole('link', { name: /ThinkPad T14 Gen 3/ })[0]).toHaveAttribute(
      'href',
      '/seller/orders/ord_1'
    );
    expect(within(table).getByText('Alice Lindqvist')).toBeVisible();
    expect(within(table).getByText('Dave Olsson')).toBeVisible();
    expect(within(table).getByText('Awaiting payment')).toBeVisible();
    expect(within(table).getByText('Expired unpaid')).toBeVisible();
    expect(screen.getByText('2 orders')).toBeVisible();
  });

  it('never shows a buyer email or the fee (D3, Q2)', () => {
    const { container } = render(<SellerOrdersView list={list()} />);

    expect(container.textContent).not.toMatch(/@|fee/i);
  });

  it('shows paging controls only when there is more than one page (D1)', () => {
    render(<SellerOrdersView list={list()} />);
    expect(screen.queryByRole('navigation', { name: 'Orders pages' })).not.toBeInTheDocument();
  });

  it('pages with Newer/Older and the position in words', () => {
    render(
      <SellerOrdersView list={list({ total: 30, page: 2, pageCount: 3, from: 13, to: 24 })} />
    );

    const nav = screen.getByRole('navigation', { name: 'Orders pages' });
    expect(within(nav).getByText('Showing 13–24 of 30 orders')).toBeVisible();
    expect(within(nav).getByRole('link', { name: 'Newer' })).toHaveAttribute(
      'href',
      '/seller/orders'
    );
    expect(within(nav).getByRole('link', { name: 'Older' })).toHaveAttribute(
      'href',
      '/seller/orders?page=3'
    );
  });

  it('explains the empty state and points at the listings (A1)', () => {
    render(<SellerOrdersView list={list({ rows: [], total: 0, from: 0, to: 0 })} />);

    expect(screen.getByText('No orders yet')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Your listings' })).toHaveAttribute(
      'href',
      '/seller/listings'
    );
  });
});
