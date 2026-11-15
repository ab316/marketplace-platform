import type { Order } from '@acme/api-contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn<() => void>() }) }));

import { OrderDetailView } from '../../../src/features/orders/components/order-detail-view.tsx';
import { toOrderDetailViewModel } from '../../../src/features/orders/view-models.ts';
import { order } from '../../unit/orders/order-view-models.unit.spec.ts';

/**
 * The order page in each state it must render (UC-014 O3–O5, A2–A3; design "The order page"):
 * status in plain words, the single forward-looking line, the timeline as one section, the
 * immutable snapshot, and only the actions that remain. Never a payment affordance (D6), never
 * the fee (D12).
 */

const renderOrder = (overrides: Partial<Order> = {}) =>
  render(<OrderDetailView order={toOrderDetailViewModel(order(overrides))} />);

describe('OrderDetailView — awaiting payment', () => {
  it('shows status, expiry, the next-step line, and offers cancelling', () => {
    renderOrder();

    expect(screen.getAllByText('Awaiting payment').length).toBeGreaterThan(0);
    expect(screen.getByText(/Held for you until/i)).toBeVisible();
    expect(screen.getByText(/What happens next:/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel this order' })).toBeEnabled();
  });

  it('never offers a payment affordance before the payment slice (D6)', () => {
    renderOrder();

    expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /pay/i })).not.toBeInTheDocument();
  });

  it('shows the snapshot as what was promised, with the seller named (P1-020)', () => {
    renderOrder();

    expect(screen.getByText(/later edits to the listing never change it/i)).toBeVisible();
    expect(screen.getByText('Nordic Refurb')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'What has happened' })).toBeVisible();
  });
});

describe('OrderDetailView — terminal and paid states', () => {
  it('leaves a cancelled order with no actions and the listing as the way back (UC-013 C5)', () => {
    renderOrder({
      status: 'cancelled',
      cancellationReason: 'buyer_cancelled',
      cancelledAt: '2026-11-12T16:00:00.000Z',
    });

    expect(screen.queryByRole('button', { name: 'Cancel this order' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View the listing' })).toHaveAttribute(
      'href',
      '/listings/lst_1'
    );
  });

  it('shows escrow safety and whose turn it is once paid, with no fee anywhere (D12)', () => {
    renderOrder({
      status: 'paid_into_escrow',
      payment: {
        status: 'paid',
        holdUntil: null,
        paidAt: '2026-11-12T14:31:00.000Z',
        attemptId: 'pay_1',
        feeRateBps: 800,
      },
    });

    expect(screen.getAllByText('Paid into escrow').length).toBeGreaterThan(0);
    expect(screen.getByText(/held safely in escrow/i)).toBeVisible();
    expect(screen.queryByText(/fee/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Held for you until/i)).not.toBeInTheDocument();
  });
});

const renderForSeller = (overrides: Partial<Order> = {}) =>
  render(<OrderDetailView order={toOrderDetailViewModel(order(overrides), 'seller')} />);

describe('OrderDetailView — the seller perspective (UC-015 R2–R5; design seller-orders.md)', () => {
  it('titles the page with the listing and names the buyer below it, with no actions', () => {
    renderForSeller();

    expect(
      screen.getByRole('heading', { level: 1, name: 'ThinkPad T14 Gen 3 — refurbished' })
    ).toBeVisible();
    expect(screen.getAllByText('Alice Lindqvist').length).toBeGreaterThan(0);
    expect(screen.getByText(/Unit held for the buyer until/i)).toBeVisible();
    expect(screen.getByText(/Waiting for the buyer to pay/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    expect(screen.getByText(/fulfillment opens in a later release/i)).toBeVisible();
  });

  it('frames the snapshot as what was sold and links back to the seller orders list', () => {
    renderForSeller();

    expect(screen.getByRole('heading', { name: 'What was sold' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/seller/orders');
    expect(screen.queryByText(/Sold by/i)).not.toBeInTheDocument();
  });

  it('shows payment secured and the seller’s turn once paid, with no fee (A3, Q2)', () => {
    renderForSeller({
      status: 'paid_into_escrow',
      payment: {
        status: 'paid',
        holdUntil: null,
        paidAt: '2026-11-12T14:31:00.000Z',
        attemptId: 'pay_1',
        feeRateBps: 800,
      },
    });

    expect(screen.getByText(/Payment secured/i)).toBeVisible();
    expect(screen.queryByText(/fee/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/held for the buyer until/i)).not.toBeInTheDocument();
  });
});
