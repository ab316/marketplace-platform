import type { Listing, Order } from '@acme/api-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Marketplace,
  type TestApp,
  auth,
  createTestApp,
  publishListing,
  seedMarketplace,
} from '../../helpers/test-app.ts';

/**
 * Reservation expiry is driven by elapsed time, not by a request, so it is tested through the
 * application command with a controlled clock. Everything else is the real wiring.
 */
let testApp: TestApp;
let market: Marketplace;

beforeEach(async () => {
  testApp = await createTestApp();
  market = await seedMarketplace(testApp);
});

afterEach(async () => {
  await testApp.close();
});

const placeOrder = async (listingId: string, token: string = market.alice.token) => {
  const response = await testApp.server.inject({
    method: 'POST',
    url: '/api/orders',
    headers: auth(token),
    payload: { listingId },
  });
  return response.json<Order>();
};

const readListing = async (listingId: string): Promise<Listing> => {
  const response = await testApp.server.inject({
    method: 'GET',
    url: `/api/listings/${listingId}`,
  });
  return response.json<Listing>();
};

const readOrder = async (orderId: string, token: string = market.alice.token): Promise<Order> => {
  const response = await testApp.server.inject({
    method: 'GET',
    url: `/api/orders/${orderId}`,
    headers: auth(token),
  });
  return response.json<Order>();
};

describe('Reservation expiry sweep', () => {
  it('leaves an order alone before its 24-hour window closes', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 1 });
    const order = await placeOrder(listingId);

    testApp.clock.advanceHours(23);
    const result = await testApp.app.orders.expireOverdueOrders.execute({ limit: 100 });

    expect(result.expiredOrderIds).toEqual([]);
    expect((await readOrder(order.id)).status).toBe('awaiting_payment');
    expect((await readListing(listingId)).availableQuantity).toBe(0);
  });

  it('cancels an overdue unpaid order and puts its unit back on sale', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 1 });
    const order = await placeOrder(listingId);

    testApp.clock.advanceHours(24);
    const result = await testApp.app.orders.expireOverdueOrders.execute({ limit: 100 });

    expect(result.expiredOrderIds).toEqual([order.id]);
    expect(result.failedOrderIds).toEqual([]);

    const expired = await readOrder(order.id);
    expect(expired.status).toBe('cancelled');
    expect(expired.cancellationReason).toBe('expired');
    expect(expired.timeline[1]).toMatchObject({ type: 'order_cancelled', title: 'Order expired' });

    expect((await readListing(listingId)).availableQuantity).toBe(1);
  });

  it('lets the released unit be ordered again', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 1 });
    await placeOrder(listingId, market.alice.token);

    testApp.clock.advanceHours(25);
    await testApp.app.orders.expireOverdueOrders.execute({ limit: 100 });

    const second = await testApp.server.inject({
      method: 'POST',
      url: '/api/orders',
      headers: auth(market.dave.token),
      payload: { listingId },
    });

    expect(second.statusCode).toBe(201);
  });

  it('is idempotent: a second sweep finds nothing left to expire', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 1 });
    await placeOrder(listingId);

    testApp.clock.advanceHours(24);
    await testApp.app.orders.expireOverdueOrders.execute({ limit: 100 });
    const second = await testApp.app.orders.expireOverdueOrders.execute({ limit: 100 });

    expect(second.expiredOrderIds).toEqual([]);
    expect((await readListing(listingId)).availableQuantity).toBe(1);
  });

  it('never expires an order the buyer already cancelled', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 1 });
    const order = await placeOrder(listingId);

    await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/cancel`,
      headers: auth(market.alice.token),
    });

    testApp.clock.advanceHours(48);
    const result = await testApp.app.orders.expireOverdueOrders.execute({ limit: 100 });

    expect(result.expiredOrderIds).toEqual([]);
    const cancelled = await readOrder(order.id);
    expect(cancelled.cancellationReason).toBe('buyer_cancelled');
    // The unit was released once by the cancellation, and must not be released twice.
    expect((await readListing(listingId)).availableQuantity).toBe(1);
  });

  it('caps one sweep at the requested batch size', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 5 });
    await placeOrder(listingId);
    await placeOrder(listingId);
    await placeOrder(listingId);

    testApp.clock.advanceHours(24);
    const result = await testApp.app.orders.expireOverdueOrders.execute({ limit: 2 });

    expect(result.expiredOrderIds).toHaveLength(2);
    expect((await readListing(listingId)).availableQuantity).toBe(4);
  });
});
