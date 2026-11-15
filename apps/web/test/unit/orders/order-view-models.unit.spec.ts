import type { Order } from '@acme/api-contracts';
import { describe, expect, it } from 'vitest';

import {
  orderStatusViewModel,
  toOrderDetailViewModel,
  toOrderRowViewModel,
  toSellerOrderRowViewModel,
} from '../../../src/features/orders/view-models.ts';

/**
 * The rules the order pages show (UC-014 O3–O5, spec D11/D12): the status in plain words, the
 * product-owned next-step line per state, and when cancelling is offered. Pure functions, tested
 * without rendering.
 */

export const order = (overrides: Partial<Order> = {}): Order => ({
  id: 'ord_1',
  status: 'awaiting_payment',
  buyerUserId: 'usr_alice',
  sellerOrganizationId: 'org_nordic',
  seller: { organizationId: 'org_nordic', name: 'Nordic Refurb' },
  buyer: { userId: 'usr_alice', displayName: 'Alice Lindqvist' },
  listingId: 'lst_1',
  quantity: 1,
  total: { amountMinor: 799_000, currency: 'SEK' },
  listingSnapshot: {
    listingId: 'lst_1',
    sellerOrganizationId: 'org_nordic',
    title: 'ThinkPad T14 Gen 3 — refurbished',
    description: 'Business laptop, professionally refurbished.',
    specifications: {
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 3',
      cpu: 'Intel Core i5-1245U',
      ramGb: 16,
      storageType: 'nvme',
      storageGb: 512,
      screenSizeInches: 14,
    },
    condition: {
      grade: 'A',
      guarantees: { batteryHealthMinPercent: 92 },
      knownDefects: 'none',
    },
    price: { amountMinor: 799_000, currency: 'SEK' },
    fulfillmentExpectations: 'Dispatched within 2 business days.',
    capturedAt: '2026-11-12T14:12:00.000Z',
  },
  createdAt: '2026-11-12T14:12:00.000Z',
  expiresAt: '2026-11-13T14:12:00.000Z',
  cancelledAt: null,
  cancellationReason: null,
  payment: { status: 'none', holdUntil: null, paidAt: null, attemptId: null, feeRateBps: null },
  timeline: [
    {
      id: 'evt_1',
      sequence: 1,
      type: 'order_created',
      occurredAt: '2026-11-12T14:12:00.000Z',
      actorUserId: 'usr_alice',
      title: 'Order created',
      description: 'One unit is reserved for this order.',
      nextStep: 'Pay to secure this order.',
    },
  ],
  ...overrides,
});

describe('orderStatusViewModel', () => {
  it('offers cancelling while awaiting payment, and says paying opens later (D6)', () => {
    const status = orderStatusViewModel(order());

    expect(status).toMatchObject({ label: 'Awaiting payment', badge: 'accent', cancellable: true });
    expect(status.nextStepLine).toContain('pay to make this laptop yours');
    expect(status.nextStepLine).toContain('opens with the next release');
    expect(status.nextStepLine).toContain('13 Nov 2026');
  });

  it('blocks cancelling while a payment is in progress (UC-013 A2)', () => {
    const status = orderStatusViewModel(
      order({
        payment: {
          status: 'in_progress',
          holdUntil: '2026-11-12T14:30:00.000Z',
          paidAt: null,
          attemptId: 'pay_1',
          feeRateBps: null,
        },
      })
    );

    expect(status.cancellable).toBe(false);
    expect(status.nextStepLine).toContain('payment for this order is in progress');
  });

  it('tells a buyer who cancelled that nothing is left to do', () => {
    const status = orderStatusViewModel(
      order({
        status: 'cancelled',
        cancellationReason: 'buyer_cancelled',
        cancelledAt: '2026-11-12T16:00:00.000Z',
      })
    );

    expect(status).toMatchObject({ label: 'Cancelled', badge: 'neutral', cancellable: false });
    expect(status.nextStepLine).toContain('You cancelled this order');
  });

  it('states expiry as the reason when the sweep cancelled it (UC-014 A2)', () => {
    const status = orderStatusViewModel(
      order({
        status: 'cancelled',
        cancellationReason: 'expired',
        cancelledAt: '2026-11-13T14:12:00.000Z',
      })
    );

    expect(status.nextStepLine).toContain('expired unpaid');
  });

  it('hands the turn to the seller once paid (UC-014 A3)', () => {
    const status = orderStatusViewModel(
      order({
        status: 'paid_into_escrow',
        payment: {
          status: 'paid',
          holdUntil: null,
          paidAt: '2026-11-12T14:31:00.000Z',
          attemptId: 'pay_1',
          feeRateBps: 800,
        },
      })
    );

    expect(status).toMatchObject({
      label: 'Paid into escrow',
      badge: 'success',
      cancellable: false,
    });
    expect(status.nextStepLine).toContain('held safely in escrow');
    // The fee is seller-borne and never buyer-visible (D12).
    expect(status.nextStepLine).not.toMatch(/fee|8%|bps/i);
  });
});

describe('toOrderDetailViewModel', () => {
  it('shows the expiry only while the order is unpaid (UC-014 O3)', () => {
    expect(toOrderDetailViewModel(order()).heldUntil).toContain('13 Nov 2026');
    expect(
      toOrderDetailViewModel(order({ status: 'cancelled', cancellationReason: 'buyer_cancelled' }))
        .heldUntil
    ).toBeNull();
  });

  it('names the seller and prices in whole kronor, never öre', () => {
    const view = toOrderDetailViewModel(order());

    expect(view.counterparty).toEqual({ label: 'Sold by', name: 'Nordic Refurb' });
    expect(view.listHref).toBe('/orders');
    expect(view.price).toContain('7');
    expect(view.price).toContain('990');
    expect(view.price).not.toContain('799000');
  });
});

describe('toOrderRowViewModel', () => {
  it('carries the one state note a list row needs', () => {
    expect(toOrderRowViewModel(order()).note).toContain('Held until');
    expect(
      toOrderRowViewModel(order({ status: 'cancelled', cancellationReason: 'expired' })).note
    ).toBe('Expired unpaid');
    expect(
      toOrderRowViewModel(order({ status: 'cancelled', cancellationReason: 'buyer_cancelled' }))
        .note
    ).toBe('Cancelled by you');
  });
});

const paid = () =>
  order({
    status: 'paid_into_escrow',
    payment: {
      status: 'paid',
      holdUntil: null,
      paidAt: '2026-11-12T14:31:00.000Z',
      attemptId: 'pay_1',
      feeRateBps: 800,
    },
  });

describe('the seller perspective (UC-015 R5, A2–A4; seller spec D4, D6)', () => {
  it('shares status words and badges with the buyer, so the two sides never disagree', () => {
    for (const sample of [order(), paid()]) {
      const buyer = orderStatusViewModel(sample, 'buyer');
      const seller = orderStatusViewModel(sample, 'seller');
      expect(seller.label).toBe(buyer.label);
      expect(seller.badge).toBe(buyer.badge);
    }
  });

  it('never offers cancelling to the seller and words the wait from their side', () => {
    const status = orderStatusViewModel(order(), 'seller');

    expect(status.cancellable).toBe(false);
    expect(status.nextStepLine).toContain('Waiting for the buyer to pay');
    expect(status.nextStepLine).toContain('13 Nov 2026');
  });

  it('says a payment in progress is being processed, not that money is secured (A4)', () => {
    const status = orderStatusViewModel(
      order({
        payment: {
          status: 'in_progress',
          holdUntil: '2026-11-12T14:30:00.000Z',
          paidAt: null,
          attemptId: 'pay_1',
          feeRateBps: null,
        },
      }),
      'seller'
    );

    expect(status.nextStepLine).toContain('being processed');
    expect(status.nextStepLine).not.toMatch(/secured/i);
  });

  it('hands the seller the turn once paid, without the fee (A3, Q2)', () => {
    const status = orderStatusViewModel(paid(), 'seller');

    expect(status.nextStepLine).toContain('Payment secured');
    expect(status.nextStepLine).toContain('fulfillment opens in a later release');
    expect(status.nextStepLine).not.toMatch(/fee|8%|bps/i);
  });

  it('tells the seller the unit is back on sale after a cancellation or expiry (A2)', () => {
    expect(
      orderStatusViewModel(
        order({ status: 'cancelled', cancellationReason: 'buyer_cancelled' }),
        'seller'
      ).nextStepLine
    ).toContain('the buyer cancelled before paying');
    expect(
      orderStatusViewModel(order({ status: 'cancelled', cancellationReason: 'expired' }), 'seller')
        .nextStepLine
    ).toContain('expired unpaid');
  });

  it('names the buyer by display name only and points back to the seller list (D3)', () => {
    const view = toOrderDetailViewModel(order(), 'seller');

    expect(view.perspective).toBe('seller');
    expect(view.counterparty).toEqual({ label: 'Ordered by', name: 'Alice Lindqvist' });
    expect(view.listHref).toBe('/seller/orders');
    expect(JSON.stringify(view)).not.toContain('@');
  });

  it('builds a received-order row with the buyer and the one note that matters', () => {
    expect(toSellerOrderRowViewModel(order())).toMatchObject({
      href: '/seller/orders/ord_1',
      buyerName: 'Alice Lindqvist',
      statusLabel: 'Awaiting payment',
    });
    expect(toSellerOrderRowViewModel(order()).note).toContain('Held until');
    expect(
      toSellerOrderRowViewModel(
        order({ status: 'cancelled', cancellationReason: 'buyer_cancelled' })
      ).note
    ).toBe('Cancelled by the buyer');
    expect(toSellerOrderRowViewModel(paid()).note).toContain('Paid');
  });
});
