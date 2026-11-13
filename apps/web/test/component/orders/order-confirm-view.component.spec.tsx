import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderConfirmView } from '../../../src/features/orders/components/order-confirm-view.tsx';
import type { OrderConfirmViewModel } from '../../../src/features/orders/view-models.ts';

/**
 * The confirmation page (UC-001 B3, spec D2; design: full-page direction): the four commitments
 * stated before one primary action, with the way out beside it.
 */

const listing: OrderConfirmViewModel = {
  listingId: 'lst_1',
  listingHref: '/listings/lst_1',
  title: 'ThinkPad T14 Gen 3 — refurbished',
  subtitle: 'Lenovo ThinkPad T14 Gen 3',
  gradeLabel: 'Grade A',
  price: '7 990 kr',
  sellerName: 'Nordic Refurb',
  fulfillmentExpectations: 'Dispatched within 2 business days.',
};

describe('OrderConfirmView', () => {
  it('states the commitment: one unit, the price, no money now, a 24-hour hold (D2)', () => {
    render(<OrderConfirmView listing={listing} />);

    expect(screen.getByRole('heading', { name: 'Confirm your order' })).toBeVisible();
    expect(screen.getByText(/no money is taken now/i)).toBeVisible();
    expect(screen.getByText(/24 hours/)).toBeVisible();
    expect(screen.getAllByText(/7 990 kr/)[0]).toBeVisible();
  });

  it('offers one primary action and a way out that places nothing', () => {
    render(<OrderConfirmView listing={listing} />);

    expect(screen.getByRole('button', { name: 'Place order — pay later' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Keep looking' })).toHaveAttribute(
      'href',
      '/listings/lst_1'
    );
  });
});
