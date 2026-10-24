import type { Listing, Order, OrderListResponse } from '@acme/api-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ACTORS,
  type TestApp,
  createTestApp,
  listingPayload,
  publishListing,
} from '../../helpers/test-app.ts';

let testApp: TestApp;

beforeEach(async () => {
  testApp = await createTestApp();
});

afterEach(async () => {
  await testApp.close();
});

const buyerHeaders = (actorId: string = ACTORS.buyerAlice) => ({ 'x-actor-id': actorId });

const placeOrder = (listingId: string, actorId: string = ACTORS.buyerAlice) =>
  testApp.server.inject({
    method: 'POST',
    url: '/api/orders',
    headers: buyerHeaders(actorId),
    payload: { listingId },
  });

const readListing = async (listingId: string): Promise<Listing> => {
  const response = await testApp.server.inject({
    method: 'GET',
    url: `/api/listings/${listingId}`,
  });
  return response.json<Listing>();
};

describe('POST /api/orders', () => {
  it('places an order awaiting payment and reserves one unit', async () => {
    const listingId = await publishListing(testApp, { quantityTotal: 2 });

    const response = await placeOrder(listingId);

    expect(response.statusCode).toBe(201);
    const order = response.json<Order>();
    expect(order).toMatchObject({
      status: 'awaiting_payment',
      buyerUserId: ACTORS.buyerAlice,
      sellerOrganizationId: 'org_nordic_refurb',
      listingId,
      quantity: 1,
      total: { amountMinor: 799_000, currency: 'SEK' },
      cancelledAt: null,
      cancellationReason: null,
    });

    const listing = await readListing(listingId);
    expect(listing.reservedQuantity).toBe(1);
    expect(listing.availableQuantity).toBe(1);
  });

  it('expires the order 24 hours after it was placed', async () => {
    const listingId = await publishListing(testApp);

    const order = (await placeOrder(listingId)).json<Order>();

    expect(new Date(order.expiresAt).getTime() - new Date(order.createdAt).getTime()).toBe(
      24 * 60 * 60 * 1000
    );
  });

  it('opens the timeline with what happened and the next step', async () => {
    const listingId = await publishListing(testApp);

    const order = (await placeOrder(listingId)).json<Order>();

    expect(order.timeline).toHaveLength(1);
    expect(order.timeline[0]).toMatchObject({
      sequence: 1,
      type: 'order_created',
      actorUserId: ACTORS.buyerAlice,
      title: 'Order created',
    });
    expect(order.timeline[0]?.nextStep).toContain('Pay to secure this order');
  });

  it('captures the full disclosure the buyer agreed to', async () => {
    const listingId = await publishListing(testApp);
    const order = (await placeOrder(listingId)).json<Order>();

    expect(order.listingSnapshot).toMatchObject({
      listingId,
      sellerOrganizationId: 'org_nordic_refurb',
      title: 'ThinkPad T14 Gen 3 — refurbished',
      price: { amountMinor: 799_000, currency: 'SEK' },
      fulfillmentExpectations: 'Dispatched within 2 business days from Gothenburg.',
    });
    expect(order.listingSnapshot.condition).toMatchObject({
      grade: 'A',
      knownDefects: 'none',
      guarantees: { batteryHealthMinPercent: 92, batteryCycleMin: 100, batteryCycleMax: 300 },
    });
    expect(order.listingSnapshot.specifications.model).toBe('ThinkPad T14 Gen 3');
  });

  it('keeps the snapshot after the listing is archived', async () => {
    const listingId = await publishListing(testApp);
    const orderId = (await placeOrder(listingId)).json<Order>().id;

    await testApp.server.inject({
      method: 'POST',
      url: `/api/listings/${listingId}/archive`,
      headers: { 'x-actor-id': ACTORS.sellerBo },
    });

    const reread = await testApp.server.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
      headers: buyerHeaders(),
    });

    expect(reread.json<Order>().listingSnapshot.title).toBe('ThinkPad T14 Gen 3 — refurbished');
    expect(reread.json<Order>().total.amountMinor).toBe(799_000);
  });

  it('never oversells: the order after the last unit is rejected', async () => {
    const listingId = await publishListing(testApp, { quantityTotal: 1 });

    const first = await placeOrder(listingId, ACTORS.buyerAlice);
    const second = await placeOrder(listingId, ACTORS.buyerDave);

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(second.json<{ error: { code: string } }>().error.code).toBe('LISTING_UNAVAILABLE');

    const listing = await readListing(listingId);
    expect(listing.reservedQuantity).toBe(1);
    expect(listing.availableQuantity).toBe(0);
  });

  it('never oversells under concurrent orders for the last unit', async () => {
    const listingId = await publishListing(testApp, { quantityTotal: 2 });

    const responses = await Promise.all([
      placeOrder(listingId, ACTORS.buyerAlice),
      placeOrder(listingId, ACTORS.buyerDave),
      placeOrder(listingId, ACTORS.buyerAlice),
      placeOrder(listingId, ACTORS.buyerDave),
    ]);

    const created = responses.filter((response) => response.statusCode === 201);
    const rejected = responses.filter((response) => response.statusCode === 409);

    expect(created).toHaveLength(2);
    expect(rejected).toHaveLength(2);

    const listing = await readListing(listingId);
    expect(listing.reservedQuantity).toBe(2);
    expect(listing.availableQuantity).toBe(0);
  });

  it('refuses an order against a draft listing', async () => {
    const created = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { 'x-actor-id': ACTORS.sellerBo },
      payload: listingPayload(),
    });

    const response = await placeOrder(created.json<Listing>().id);

    expect(response.statusCode).toBe(409);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('LISTING_UNAVAILABLE');
  });

  it('refuses an order against an archived listing', async () => {
    const listingId = await publishListing(testApp);
    await testApp.server.inject({
      method: 'POST',
      url: `/api/listings/${listingId}/archive`,
      headers: { 'x-actor-id': ACTORS.sellerBo },
    });

    const response = await placeOrder(listingId);

    expect(response.statusCode).toBe(409);
  });

  it('returns 404 for an unknown listing', async () => {
    const response = await placeOrder('lst_nope');

    expect(response.statusCode).toBe(404);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('LISTING_NOT_FOUND');
  });

  it('requires an authenticated buyer', async () => {
    const listingId = await publishListing(testApp);

    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/orders',
      payload: { listingId },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /api/orders/:orderId', () => {
  it('is visible to the buyer and to the selling organization', async () => {
    const listingId = await publishListing(testApp);
    const orderId = (await placeOrder(listingId)).json<Order>().id;

    const buyerView = await testApp.server.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
      headers: buyerHeaders(),
    });
    expect(buyerView.statusCode).toBe(200);

    const sellerView = await testApp.server.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
      headers: { 'x-actor-id': ACTORS.sellerBo },
    });
    expect(sellerView.statusCode).toBe(200);
  });

  it('is hidden from an unrelated buyer and another organization', async () => {
    const listingId = await publishListing(testApp);
    const orderId = (await placeOrder(listingId)).json<Order>().id;

    const otherBuyer = await testApp.server.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
      headers: buyerHeaders(ACTORS.buyerDave),
    });
    expect(otherBuyer.statusCode).toBe(403);

    const otherOrg = await testApp.server.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
      headers: { 'x-actor-id': ACTORS.sellerJonas },
    });
    expect(otherOrg.statusCode).toBe(403);
  });

  it('returns 404 for an unknown order', async () => {
    const response = await testApp.server.inject({
      method: 'GET',
      url: '/api/orders/ord_nope',
      headers: buyerHeaders(),
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('POST /api/orders/:orderId/cancel', () => {
  it('cancels an unpaid order and returns the unit to stock', async () => {
    const listingId = await publishListing(testApp, { quantityTotal: 1 });
    const orderId = (await placeOrder(listingId)).json<Order>().id;

    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/cancel`,
      headers: buyerHeaders(),
    });

    expect(response.statusCode).toBe(200);
    const order = response.json<Order>();
    expect(order.status).toBe('cancelled');
    expect(order.cancellationReason).toBe('buyer_cancelled');
    expect(order.timeline).toHaveLength(2);
    expect(order.timeline[1]).toMatchObject({ type: 'order_cancelled', title: 'Order cancelled' });

    const listing = await readListing(listingId);
    expect(listing.availableQuantity).toBe(1);
    expect(listing.reservedQuantity).toBe(0);
  });

  it('lets the freed unit be ordered again', async () => {
    const listingId = await publishListing(testApp, { quantityTotal: 1 });
    const orderId = (await placeOrder(listingId, ACTORS.buyerAlice)).json<Order>().id;

    await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/cancel`,
      headers: buyerHeaders(ACTORS.buyerAlice),
    });

    const second = await placeOrder(listingId, ACTORS.buyerDave);
    expect(second.statusCode).toBe(201);
  });

  it('cannot be cancelled twice', async () => {
    const listingId = await publishListing(testApp);
    const orderId = (await placeOrder(listingId)).json<Order>().id;

    await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/cancel`,
      headers: buyerHeaders(),
    });
    const again = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/cancel`,
      headers: buyerHeaders(),
    });

    expect(again.statusCode).toBe(409);
    expect(again.json<{ error: { code: string } }>().error.code).toBe('ORDER_STATE_CONFLICT');
  });

  it('refuses cancellation by anyone other than the buyer', async () => {
    const listingId = await publishListing(testApp);
    const orderId = (await placeOrder(listingId)).json<Order>().id;

    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/cancel`,
      headers: buyerHeaders(ACTORS.buyerDave),
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('GET /api/buyer/orders', () => {
  it('lists only the signed-in buyer’s orders', async () => {
    const listingId = await publishListing(testApp, { quantityTotal: 5 });
    await placeOrder(listingId, ACTORS.buyerAlice);
    await placeOrder(listingId, ACTORS.buyerAlice);
    await placeOrder(listingId, ACTORS.buyerDave);

    const response = await testApp.server.inject({
      method: 'GET',
      url: '/api/buyer/orders',
      headers: buyerHeaders(ACTORS.buyerAlice),
    });

    expect(response.statusCode).toBe(200);
    const page = response.json<OrderListResponse>();
    expect(page.total).toBe(2);
    expect(page.items.every((order) => order.buyerUserId === ACTORS.buyerAlice)).toBe(true);
  });
});
