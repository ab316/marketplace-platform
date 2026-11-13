import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  type OrdersListPageViewModel,
  OrdersListView,
} from '../../../src/features/orders/components/orders-list-view.tsx';
import { toOrderRowViewModel } from '../../../src/features/orders/view-models.ts';
import { order } from '../../unit/orders/order-view-models.unit.spec.ts';

/** The /orders list (UC-014 O1/A1, D7/D9): rows, paging, and the empty state that points onward. */

const list = (overrides: Partial<OrdersListPageViewModel> = {}): OrdersListPageViewModel => ({
  rows: [
    toOrderRowViewModel(order()),
    toOrderRowViewModel(order({ id: 'ord_2', status: 'cancelled', cancellationReason: 'expired' })),
  ],
  total: 2,
  page: 1,
  pageCount: 1,
  from: 1,
  to: 2,
  ...overrides,
});

describe('OrdersListView', () => {
  it('lists orders newest first with status, note, amount, and a link each', () => {
    render(<OrdersListView list={list()} />);

    expect(screen.getAllByRole('link', { name: /ThinkPad T14 Gen 3/ })[0]).toHaveAttribute(
      'href',
      '/orders/ord_1'
    );
    expect(screen.getByText('Awaiting payment')).toBeVisible();
    expect(screen.getByText(/Expired unpaid/)).toBeVisible();
  });

  it('shows paging controls only when there is more than one page (D9)', () => {
    render(<OrdersListView list={list()} />);
    expect(screen.queryByRole('navigation', { name: 'Orders pages' })).not.toBeInTheDocument();
  });

  it('pages at 12 with Newer/Older and the position stated', () => {
    render(<OrdersListView list={list({ total: 19, page: 1, pageCount: 2, from: 1, to: 12 })} />);

    expect(screen.getByText('Showing 1–12 of 19 orders')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Older' })).toHaveAttribute('href', '/orders?page=2');
    expect(screen.getByRole('button', { name: 'Newer' })).toBeDisabled();
  });

  it('gives a buyer with no orders a route forward, never a blank page (UC-014 A1)', () => {
    render(<OrdersListView list={list({ rows: [], total: 0 })} />);

    expect(screen.getByText('No orders yet')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Browse laptops' })).toHaveAttribute(
      'href',
      '/listings'
    );
  });
});
