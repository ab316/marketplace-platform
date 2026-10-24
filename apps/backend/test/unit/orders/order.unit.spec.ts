import { describe, expect, it } from 'vitest';

import {
  InvalidOrderStateError,
  Order,
  UNPAID_ORDER_TTL_HOURS,
  type ListingSnapshot,
} from '../../../src/modules/orders/domain/order.ts';

const now = new Date('2026-10-24T10:00:00Z');

const snapshot: ListingSnapshot = {
  listingId: 'listing-1',
  title: 'Lenovo ThinkPad T14 Gen 3',
  description: 'Refurbished business laptop',
  brand: 'Lenovo',
  model: 'ThinkPad T14 Gen 3',
  cpu: 'Ryzen 5 PRO 6650U',
  ram: '16 GB',
  storage: '512 GB NVMe SSD',
  screenSize: '14"',
  conditionGrade: 'A',
  conditionGuarantees: { batteryHealthMinPercent: 90 },
  knownDefects: 'none',
  priceOre: 549_900,
  currency: 'SEK',
  fulfillmentExpectations: 'Ships within 2 business days',
};

function createOrder(): Order {
  return Order.create({
    id: 'order-1',
    timelineEntryId: 'entry-1',
    buyerId: 'buyer-1',
    sellerOrganizationId: 'org-1',
    listingSnapshot: snapshot,
    now,
  });
}

describe('Order', () => {
  it('starts awaiting payment with a 24h expiry and the snapshot price', () => {
    const order = createOrder();
    expect(order.props.status).toBe('awaiting_payment');
    expect(order.props.priceOre).toBe(snapshot.priceOre);
    expect(order.props.expiresAt.getTime() - now.getTime()).toBe(
      UNPAID_ORDER_TTL_HOURS * 60 * 60 * 1000
    );
  });

  it('records an order_created timeline entry answering what happened and what is next', () => {
    const order = createOrder();
    expect(order.props.timeline).toHaveLength(1);
    const entry = order.props.timeline.at(0);
    expect(entry?.type).toBe('order_created');
    expect(entry?.actorId).toBe('buyer-1');
    expect(entry?.nextStep).toContain('24 hours');
  });

  it('buyer cancellation moves the order to cancelled with a timeline entry', () => {
    const order = createOrder();
    order.cancel({
      reason: 'buyer_cancelled',
      actorId: 'buyer-1',
      timelineEntryId: 'entry-2',
      now,
    });
    expect(order.props.status).toBe('cancelled');
    expect(order.props.cancellationReason).toBe('buyer_cancelled');
    expect(order.props.timeline.at(-1)?.type).toBe('order_cancelled');
  });

  it('a cancelled order can never be cancelled again (terminal state)', () => {
    const order = createOrder();
    order.cancel({
      reason: 'buyer_cancelled',
      actorId: 'buyer-1',
      timelineEntryId: 'entry-2',
      now,
    });
    expect(() =>
      order.cancel({ reason: 'expired', actorId: null, timelineEntryId: 'entry-3', now })
    ).toThrow(InvalidOrderStateError);
  });

  it('supports expiry as a cancellation reason with no actor', () => {
    const order = createOrder();
    order.cancel({ reason: 'expired', actorId: null, timelineEntryId: 'entry-2', now });
    expect(order.props.cancellationReason).toBe('expired');
    expect(order.props.timeline.at(-1)?.message).toContain('expired');
  });
});
