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
