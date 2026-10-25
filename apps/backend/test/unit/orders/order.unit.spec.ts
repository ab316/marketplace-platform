import { Money } from '@acme/core-domain';
import { describe, expect, it } from 'vitest';

import { OrderStateError } from '../../../src/modules/orders/domain/errors.ts';
import type { ListingSnapshot } from '../../../src/modules/orders/domain/listing-snapshot.ts';
import { Order, type PlaceOrderInput } from '../../../src/modules/orders/domain/order.ts';

const NOW = new Date('2026-10-24T09:00:00.000Z');
const EXPIRES_AT = new Date('2026-10-25T09:00:00.000Z');

const snapshot: ListingSnapshot = {
  listingId: 'lst_1',
  sellerOrganizationId: 'org_nordic_refurb',
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
    guarantees: { batteryHealthMinPercent: 92, batteryCycleMin: 100, batteryCycleMax: 300 },
    knownDefects: 'none',
  },
  price: Money.fromMinor(799_000),
  fulfillmentExpectations: 'Dispatched within 2 business days.',
  capturedAt: NOW,
};

const placeInput = (overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
  id: 'ord_1',
  buyerUserId: 'usr_buyer_alice',
  listingSnapshot: snapshot,
  now: NOW,
  expiresAt: EXPIRES_AT,
  timelineEntryId: 'ord_evt_1',
  ...overrides,
});

const placedOrder = (overrides: Partial<PlaceOrderInput> = {}): Order =>
  Order.place(placeInput(overrides));

describe('Placing an order', () => {
  it('awaits payment and records what the buyer was promised', () => {
    const order = placedOrder();

    expect(order.status).toBe('awaiting_payment');
    expect(order.state.total.equals(Money.fromMinor(799_000))).toBe(true);
    expect(order.state.listingSnapshot.title).toBe('ThinkPad T14 Gen 3 — refurbished');
    expect(order.state.expiresAt).toEqual(EXPIRES_AT);
    expect(order.state.cancelledAt).toBeNull();
  });

  it('opens the timeline with the order creation', () => {
    const order = placedOrder();

    expect(order.state.timeline).toHaveLength(1);
    expect(order.state.timeline[0]).toMatchObject({
      sequence: 1,
      type: 'order_created',
      actorUserId: 'usr_buyer_alice',
      occurredAt: NOW,
    });
  });

  it('refuses an expiry that has already passed', () => {
    expect(() => placedOrder({ expiresAt: new Date('2026-10-24T08:00:00.000Z') })).toThrow(
      OrderStateError
    );
  });
});

describe('Cancelling an order', () => {
  it('ends the order and appends a timeline entry', () => {
    const order = placedOrder();

    order.cancel({
      reason: 'buyer_cancelled',
      actorUserId: 'usr_buyer_alice',
      now: EXPIRES_AT,
      timelineEntryId: 'ord_evt_2',
    });

    expect(order.status).toBe('cancelled');
    expect(order.state.cancellationReason).toBe('buyer_cancelled');
    expect(order.state.cancelledAt).toEqual(EXPIRES_AT);
    expect(order.state.timeline).toHaveLength(2);
    expect(order.state.timeline[1]).toMatchObject({ sequence: 2, type: 'order_cancelled' });
  });

  it('records expiry as a system action with no actor', () => {
    const order = placedOrder();

    order.cancel({
      reason: 'expired',
      actorUserId: null,
      now: EXPIRES_AT,
      timelineEntryId: 'ord_evt_2',
    });

    expect(order.state.cancellationReason).toBe('expired');
    expect(order.state.timeline[1]?.actorUserId).toBeNull();
  });

  it('is terminal: a cancelled order cannot be cancelled again', () => {
    const order = placedOrder();
    const cancellation = {
      reason: 'buyer_cancelled' as const,
      actorUserId: 'usr_buyer_alice',
      now: EXPIRES_AT,
      timelineEntryId: 'ord_evt_2',
    };

    order.cancel(cancellation);

    expect(() => order.cancel({ ...cancellation, timelineEntryId: 'ord_evt_3' })).toThrow(
      OrderStateError
    );
    expect(order.state.timeline).toHaveLength(2);
  });
});

describe('Reservation expiry', () => {
  it('is not expired before the window closes', () => {
    const order = placedOrder();

    expect(order.isExpiredAt(new Date('2026-10-25T08:59:59.000Z'))).toBe(false);
  });

  it('is expired once the window has elapsed', () => {
    const order = placedOrder();

    expect(order.isExpiredAt(EXPIRES_AT)).toBe(true);
  });

  it('is never expired once cancelled', () => {
    const order = placedOrder();
    order.cancel({
      reason: 'buyer_cancelled',
      actorUserId: 'usr_buyer_alice',
      now: NOW,
      timelineEntryId: 'ord_evt_2',
    });

    expect(order.isExpiredAt(new Date('2026-11-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('Payment hold (PD-0004 §2)', () => {
  const HOLD_UNTIL = new Date('2026-10-24T09:15:00.000Z');

  it('protects the order from expiry while active, then lets it expire again', () => {
    const order = placedOrder();
    order.holdForPayment({ attemptId: 'pay_1', holdUntil: HOLD_UNTIL, now: NOW });

    expect(order.isHeldForPaymentAt(NOW)).toBe(true);
    // Overdue by the clock, but held: not expired.
    expect(
      Order.restore({
        ...order.state,
        expiresAt: new Date('2026-10-24T09:05:00.000Z'),
      }).isExpiredAt(new Date('2026-10-24T09:10:00.000Z'))
    ).toBe(false);
    // Hold lapsed: expired.
    expect(
      Order.restore({
        ...order.state,
        expiresAt: new Date('2026-10-24T09:05:00.000Z'),
      }).isExpiredAt(HOLD_UNTIL)
    ).toBe(true);
  });

  it('refuses cancellation while a payment is in progress', () => {
    const order = placedOrder();
    order.holdForPayment({ attemptId: 'pay_1', holdUntil: HOLD_UNTIL, now: NOW });

    expect(() =>
      order.cancel({
        reason: 'buyer_cancelled',
        actorUserId: 'usr_buyer_alice',
        now: NOW,
        timelineEntryId: 'ord_evt_2',
      })
    ).toThrow(OrderStateError);
    expect(order.status).toBe('awaiting_payment');
  });

  it('refuses a second hold while one is active, and any hold on an unpayable order', () => {
    const order = placedOrder();
    order.holdForPayment({ attemptId: 'pay_1', holdUntil: HOLD_UNTIL, now: NOW });
    expect(() =>
      order.holdForPayment({ attemptId: 'pay_2', holdUntil: HOLD_UNTIL, now: NOW })
    ).toThrow(OrderStateError);

    const expired = placedOrder();
    expect(() =>
      expired.holdForPayment({ attemptId: 'pay_3', holdUntil: HOLD_UNTIL, now: EXPIRES_AT })
    ).toThrow(OrderStateError);
  });

  it('reports payment in progress while held, and nothing before', () => {
    const order = placedOrder();
    expect(order.paymentStatusAt(NOW)).toBe('none');

    order.holdForPayment({ attemptId: 'pay_1', holdUntil: HOLD_UNTIL, now: NOW });
    expect(order.paymentStatusAt(NOW)).toBe('in_progress');
  });
});

const paid = () => {
  const order = placedOrder();
  order.holdForPayment({ attemptId: 'pay_1', holdUntil: EXPIRES_AT, now: NOW });
  const outcome = order.markPaid({
    attemptId: 'pay_1',
    feeRateBps: 800,
    now: NOW,
    timelineEntryId: 'ord_evt_2',
  });
  return { order, outcome };
};

describe('Paying an order (UC-004)', () => {
  it('moves into escrow, freezes the fee rate, clears the hold, and records "Payment secured"', () => {
    const { order, outcome } = paid();

    expect(outcome).toEqual({ outcome: 'paid' });
    expect(order.status).toBe('paid_into_escrow');
    expect(order.state.paidByAttemptId).toBe('pay_1');
    expect(order.state.feeRateBps).toBe(800);
    expect(order.state.paidAt).toEqual(NOW);
    expect(order.isHeldForPaymentAt(NOW)).toBe(false);
    expect(order.paymentStatusAt(NOW)).toBe('paid');
    expect(order.state.timeline[1]).toMatchObject({
      type: 'payment_secured',
      actorUserId: 'usr_buyer_alice',
      details: { attemptId: 'pay_1', amountMinor: 799_000, feeRateBps: 800 },
    });
  });

  it('is idempotent for the same attempt and reports another attempt as already paid', () => {
    const { order } = paid();

    expect(
      order.markPaid({ attemptId: 'pay_1', feeRateBps: 800, now: NOW, timelineEntryId: 'x' })
    ).toEqual({ outcome: 'already_paid', byAttemptId: 'pay_1' });
    expect(
      order.markPaid({ attemptId: 'pay_2', feeRateBps: 800, now: NOW, timelineEntryId: 'x' })
    ).toEqual({ outcome: 'already_paid', byAttemptId: 'pay_1' });
    expect(order.state.timeline).toHaveLength(2);
  });

  it('reports a cancelled order as not payable instead of reviving it (PD-0004 §3)', () => {
    const order = placedOrder();
    order.cancel({
      reason: 'expired',
      actorUserId: null,
      now: EXPIRES_AT,
      timelineEntryId: 'ord_evt_2',
    });

    const outcome = order.markPaid({
      attemptId: 'pay_1',
      feeRateBps: 800,
      now: EXPIRES_AT,
      timelineEntryId: 'ord_evt_3',
    });

    expect(outcome).toEqual({ outcome: 'not_payable', status: 'cancelled' });
    expect(order.status).toBe('cancelled');
  });

  it('cannot be cancelled once paid', () => {
    const { order } = paid();

    expect(() =>
      order.cancel({
        reason: 'buyer_cancelled',
        actorUserId: 'usr_buyer_alice',
        now: NOW,
        timelineEntryId: 'x',
      })
    ).toThrow(OrderStateError);
  });

  it('never expires once paid', () => {
    const { order } = paid();

    expect(order.isExpiredAt(new Date('2026-11-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('Payment failure and return', () => {
  it('a failed payment clears the hold and leaves the order payable with its original expiry', () => {
    const order = placedOrder();
    order.holdForPayment({ attemptId: 'pay_1', holdUntil: EXPIRES_AT, now: NOW });

    order.recordPaymentFailed({
      attemptId: 'pay_1',
      reason: 'card_declined',
      now: NOW,
      timelineEntryId: 'ord_evt_2',
    });

    expect(order.status).toBe('awaiting_payment');
    expect(order.isHeldForPaymentAt(NOW)).toBe(false);
    expect(order.state.expiresAt).toEqual(EXPIRES_AT);
    expect(order.isPayableAt(NOW)).toBe(true);
    expect(order.paymentStatusAt(NOW)).toBe('failed');
    expect(order.state.timeline[1]).toMatchObject({
      type: 'payment_failed',
      details: { attemptId: 'pay_1', reason: 'card_declined' },
    });
  });

  it('a returned payment is recorded on a cancelled order without changing its status', () => {
    const order = placedOrder();
    order.cancel({ reason: 'expired', actorUserId: null, now: EXPIRES_AT, timelineEntryId: 'e2' });

    order.recordPaymentReturned({
      attemptId: 'pay_1',
      reason: 'order_cancelled',
      now: EXPIRES_AT,
      timelineEntryId: 'e3',
    });

    expect(order.status).toBe('cancelled');
    expect(order.paymentStatusAt(EXPIRES_AT)).toBe('returned');
    expect(order.state.timeline[2]).toMatchObject({
      type: 'payment_returned',
      details: { attemptId: 'pay_1', reason: 'order_cancelled', amountMinor: 799_000 },
    });
  });

  it('a payment is never "returned" on an order that could simply have taken it', () => {
    const order = placedOrder();

    expect(() =>
      order.recordPaymentReturned({
        attemptId: 'pay_1',
        reason: 'order_cancelled',
        now: NOW,
        timelineEntryId: 'e2',
      })
    ).toThrow(OrderStateError);
  });
});
