import type {
  Listing,
  Order,
  OrderFinancialHistoryResponse,
  OrderPaymentsResponse,
  PaymentAttempt,
} from '@acme/api-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Marketplace,
  type TestApp,
  auth,
  createTestApp,
  deliverCallback,
  errorCodeOf,
  payOrder,
  placeOrder,
  publishListing,
  readOrder,
  seedMarketplace,
  successCallback,
} from '../../helpers/test-app.ts';

/**
 * UC-004 through the public HTTP contract with the simulated provider (ADR-009 §2). Each scenario
 * asserts the buyer-visible outcome and, where money moved, the operator's financial history.
 */
let testApp: TestApp;
let market: Marketplace;
let listingId: string;
let order: Order;

beforeEach(async () => {
  testApp = await createTestApp();
  market = await seedMarketplace(testApp);
  listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 2 });
  order = await placeOrder(testApp, market.alice.token, listingId);
});

afterEach(async () => {
  await testApp.close();
});

const readListing = async (id: string): Promise<Listing> =>
  (await testApp.server.inject({ method: 'GET', url: `/api/listings/${id}` })).json<Listing>();

const financialHistory = async (orderId: string): Promise<OrderFinancialHistoryResponse> => {
  const response = await testApp.server.inject({
    method: 'GET',
    url: `/api/orders/${orderId}/financial-history`,
    headers: auth(market.adminToken),
  });
  expect(response.statusCode).toBe(200);
  return response.json<OrderFinancialHistoryResponse>();
};

const attemptsFor = async (orderId: string): Promise<PaymentAttempt[]> => {
  const response = await testApp.server.inject({
    method: 'GET',
    url: `/api/orders/${orderId}/payments`,
    headers: auth(market.adminToken),
  });
  expect(response.statusCode).toBe(200);
  return response.json<OrderPaymentsResponse>().attempts;
};

describe('POST /api/orders/:orderId/pay — success (UC-004 main flow)', () => {
  it('accepts the payment as pending and reports it in progress until the provider answers', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/pay`,
      headers: auth(market.alice.token),
      payload: {},
    });

    expect(response.statusCode).toBe(202);
    const attempt = response.json<PaymentAttempt>();
    expect(attempt).toMatchObject({
      orderId: order.id,
      buyerUserId: market.alice.userId,
      status: 'pending',
      amount: { amountMinor: 799_000, currency: 'SEK' },
      provider: 'simulated',
      feeRateBps: null,
    });
    expect(new Date(attempt.timesOutAt).getTime() - new Date(attempt.startedAt).getTime()).toBe(
      15 * 60 * 1000
    );

    const inProgress = await readOrder(testApp, market.alice.token, order.id);
    expect(inProgress.status).toBe('awaiting_payment');
    expect(inProgress.payment.status).toBe('in_progress');
    expect(inProgress.payment.holdUntil).toBe(attempt.timesOutAt);

    await testApp.app.backgroundTasks.drain();
  });

  it('moves the order into escrow with "Payment secured", converts the unit to sold, and freezes the fee rate', async () => {
    const attempt = await payOrder(testApp, market.alice.token, order.id);

    const paid = await readOrder(testApp, market.alice.token, order.id);
    expect(paid.status).toBe('paid_into_escrow');
    expect(paid.payment).toMatchObject({
      status: 'paid',
      holdUntil: null,
      attemptId: attempt.id,
      feeRateBps: 800,
    });
    expect(typeof paid.payment.paidAt).toBe('string');
    expect(paid.timeline).toHaveLength(2);
    expect(paid.timeline[1]).toMatchObject({
      type: 'payment_secured',
      title: 'Payment secured',
      actorUserId: market.alice.userId,
    });
    expect(paid.timeline[1]?.nextStep).toContain('seller');

    const listing = await readListing(listingId);
    expect(listing).toMatchObject({
      totalQuantity: 2,
      reservedQuantity: 0,
      soldQuantity: 1,
      availableQuantity: 1,
    });

    const [stored] = await attemptsFor(order.id);
    expect(stored).toMatchObject({
      id: attempt.id,
      status: 'succeeded',
      feeRateBps: 800,
      providerReference: `sim_${attempt.id}`,
    });
  });

  it('holds exactly the order total in the order’s escrow', async () => {
    await payOrder(testApp, market.alice.token, order.id);

    const history = await financialHistory(order.id);
    expect(history.escrowBalance).toEqual({ amountMinor: 799_000, currency: 'SEK' });
    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]).toMatchObject({
      kind: 'payment_captured',
      total: { amountMinor: 799_000, currency: 'SEK' },
    });
    expect(history.entries[0]?.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          account: { kind: 'provider_clearing', ownerId: 'simulated' },
          side: 'debit',
        }),
        expect.objectContaining({
          account: { kind: 'order_escrow', ownerId: order.id },
          side: 'credit',
        }),
      ])
    );
  });

  it('is visible to the seller as payment secured, and in the buyer’s order list', async () => {
    await payOrder(testApp, market.alice.token, order.id);

    const sellerView = await readOrder(testApp, market.nils.token, order.id);
    expect(sellerView.status).toBe('paid_into_escrow');
    expect(sellerView.payment.status).toBe('paid');

    const list = await testApp.server.inject({
      method: 'GET',
      url: '/api/buyer/orders',
      headers: auth(market.alice.token),
    });
    expect(list.json<{ items: Order[] }>().items[0]?.payment.status).toBe('paid');
  });

  it('cannot be cancelled by the buyer once paid', async () => {
    await payOrder(testApp, market.alice.token, order.id);

    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/cancel`,
      headers: auth(market.alice.token),
    });

    expect(response.statusCode).toBe(409);
    expect(errorCodeOf(response)).toBe('ORDER_STATE_CONFLICT');
  });

  it('refuses a second payment for a paid order', async () => {
    await payOrder(testApp, market.alice.token, order.id);

    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/pay`,
      headers: auth(market.alice.token),
      payload: {},
    });

    expect(response.statusCode).toBe(409);
    expect(errorCodeOf(response)).toBe('ORDER_NOT_PAYABLE');
    expect(await attemptsFor(order.id)).toHaveLength(1);
  });
});

describe('Payment failure (UC-004 A1)', () => {
  it('keeps the order awaiting payment with its original expiry, records "Payment failed", and allows a retry', async () => {
    const attempt = await payOrder(testApp, market.alice.token, order.id, 'failure');

    const after = await readOrder(testApp, market.alice.token, order.id);
    expect(after.status).toBe('awaiting_payment');
    expect(after.expiresAt).toBe(order.expiresAt);
    expect(after.payment).toMatchObject({ status: 'failed', holdUntil: null, attemptId: null });
    expect(after.timeline[1]).toMatchObject({ type: 'payment_failed', title: 'Payment failed' });
    expect(after.timeline[1]?.nextStep).toContain('Try again');

    expect((await attemptsFor(order.id))[0]).toMatchObject({
      id: attempt.id,
      status: 'failed',
      failureReason: 'card_declined',
    });
    expect((await financialHistory(order.id)).entries).toHaveLength(0);
    expect((await readListing(listingId)).soldQuantity).toBe(0);

    await payOrder(testApp, market.alice.token, order.id, 'success');
    expect((await readOrder(testApp, market.alice.token, order.id)).status).toBe(
      'paid_into_escrow'
    );
    expect(await attemptsFor(order.id)).toHaveLength(2);
  });
});

describe('Duplicate provider report (UC-004 A3)', () => {
  it('applies the success exactly once', async () => {
    await payOrder(testApp, market.alice.token, order.id, 'duplicate_success');

    const paid = await readOrder(testApp, market.alice.token, order.id);
    expect(paid.status).toBe('paid_into_escrow');
    expect(paid.timeline.filter((entry) => entry.type === 'payment_secured')).toHaveLength(1);
    expect((await financialHistory(order.id)).escrowBalance.amountMinor).toBe(799_000);
    expect((await readListing(listingId)).soldQuantity).toBe(1);
  });

  it('a redelivered callback through the webhook changes nothing either', async () => {
    const attempt = await payOrder(testApp, market.alice.token, order.id);

    const replay = await deliverCallback(testApp, successCallback(attempt, 'replayed-event'));

    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual({ accepted: true, result: 'paid' });
    expect((await financialHistory(order.id)).entries).toHaveLength(1);
    expect((await readOrder(testApp, market.alice.token, order.id)).timeline).toHaveLength(2);
  });
});

describe('Payment in progress (UC-004 A6)', () => {
  it('refuses a second start while one attempt is pending', async () => {
    await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/pay`,
      headers: auth(market.alice.token),
      payload: { scenario: 'timeout' },
    });

    const second = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/pay`,
      headers: auth(market.alice.token),
      payload: {},
    });

    expect(second.statusCode).toBe(409);
    expect(errorCodeOf(second)).toBe('PAYMENT_IN_PROGRESS');
    expect(await attemptsFor(order.id)).toHaveLength(1);
  });

  it('produces exactly one attempt under concurrent starts', async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        testApp.server.inject({
          method: 'POST',
          url: `/api/orders/${order.id}/pay`,
          headers: auth(market.alice.token),
          payload: { scenario: 'timeout' },
        })
      )
    );

    expect(responses.filter((response) => response.statusCode === 202)).toHaveLength(1);
    expect(responses.filter((response) => response.statusCode === 409)).toHaveLength(4);
    expect((await attemptsFor(order.id)).filter((a) => a.status === 'pending')).toHaveLength(1);
  });

  it('blocks buyer cancellation while a payment is in progress', async () => {
    await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/pay`,
      headers: auth(market.alice.token),
      payload: { scenario: 'timeout' },
    });

    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/cancel`,
      headers: auth(market.alice.token),
    });

    expect(response.statusCode).toBe(409);
    expect(errorCodeOf(response)).toBe('ORDER_STATE_CONFLICT');
  });
});

describe('Order no longer payable (UC-004 A7)', () => {
  it('refuses payment for a cancelled order', async () => {
    await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/cancel`,
      headers: auth(market.alice.token),
    });

    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/pay`,
      headers: auth(market.alice.token),
      payload: {},
    });

    expect(response.statusCode).toBe(409);
    expect(await attemptsFor(order.id)).toHaveLength(0);
  });

  it('refuses payment once the expiry time has passed, even before the sweep runs', async () => {
    testApp.clock.advanceHours(24);

    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/pay`,
      headers: auth(market.alice.token),
      payload: {},
    });

    expect(response.statusCode).toBe(409);
    expect(errorCodeOf(response)).toBe('ORDER_NOT_PAYABLE');
  });
});

describe('Late success for a dead order (UC-004 A4)', () => {
  it('returns the money, records "Payment returned", and never revives the order', async () => {
    const attempt = await payOrder(testApp, market.alice.token, order.id, 'timeout');

    // The provider stays silent, the attempt times out, the order expires and its unit is released.
    testApp.clock.advanceHours(1);
    await testApp.app.payments.api.expirePendingPaymentAttempts.execute({ limit: 100 });
    testApp.clock.advanceHours(24);
    await testApp.app.orders.expireOverdueOrders.execute({ limit: 100 });
    expect((await readOrder(testApp, market.alice.token, order.id)).status).toBe('cancelled');
    expect((await readListing(listingId)).availableQuantity).toBe(2);

    // Then the provider reports success after all.
    const late = await deliverCallback(testApp, successCallback(attempt));
    expect(late.statusCode).toBe(200);
    expect(late.json()).toEqual({ accepted: true, result: 'returned' });

    const after = await readOrder(testApp, market.alice.token, order.id);
    expect(after.status).toBe('cancelled');
    expect(after.payment.status).toBe('returned');
    expect(after.timeline.at(-1)).toMatchObject({
      type: 'payment_returned',
      title: 'Payment returned',
    });
    expect(after.timeline.at(-1)?.nextStep).toContain('new order');

    const history = await financialHistory(order.id);
    expect(history.escrowBalance.amountMinor).toBe(0);
    expect(history.entries.map((entry) => entry.kind)).toEqual([
      'payment_captured',
      'payment_reversed',
    ]);

    expect((await attemptsFor(order.id))[0]?.status).toBe('reversed');
    // The unit stays on sale: a returned payment never sells anything.
    expect(await readListing(listingId)).toMatchObject({ soldQuantity: 0, availableQuantity: 2 });
  });

  it('returns a late payment when the order was meanwhile paid by another attempt', async () => {
    const first = await payOrder(testApp, market.alice.token, order.id, 'timeout');
    testApp.clock.advanceHours(1);
    await testApp.app.payments.api.expirePendingPaymentAttempts.execute({ limit: 100 });

    const second = await payOrder(testApp, market.alice.token, order.id, 'success');
    expect((await readOrder(testApp, market.alice.token, order.id)).payment.attemptId).toBe(
      second.id
    );

    const late = await deliverCallback(testApp, successCallback(first));
    expect(late.json()).toEqual({ accepted: true, result: 'returned' });

    const after = await readOrder(testApp, market.alice.token, order.id);
    expect(after.status).toBe('paid_into_escrow');
    expect(after.payment.attemptId).toBe(second.id);
    expect(after.timeline.at(-1)).toMatchObject({ type: 'payment_returned' });
    expect(after.timeline.at(-1)?.description).toContain('already been paid');

    // Escrow holds exactly one order total; the duplicate went back.
    const history = await financialHistory(order.id);
    expect(history.escrowBalance.amountMinor).toBe(799_000);
    expect(history.entries).toHaveLength(3);
    expect((await readListing(listingId)).soldQuantity).toBe(1);
  });
});

describe('Late success for a live order (UC-004 A5)', () => {
  it('pays the order when the provider answers after the attempt timed out', async () => {
    const attempt = await payOrder(testApp, market.alice.token, order.id, 'timeout');
    testApp.clock.advanceHours(1);
    await testApp.app.payments.api.expirePendingPaymentAttempts.execute({ limit: 100 });
    expect((await readOrder(testApp, market.alice.token, order.id)).payment.status).toBe('failed');

    const late = await deliverCallback(testApp, successCallback(attempt));

    expect(late.json()).toEqual({ accepted: true, result: 'paid' });
    const after = await readOrder(testApp, market.alice.token, order.id);
    expect(after.status).toBe('paid_into_escrow');
    expect(after.payment.attemptId).toBe(attempt.id);
    expect((await attemptsFor(order.id))[0]?.status).toBe('succeeded');
  });
});

describe('Provider callback rejection (UC-004 E2)', () => {
  it('rejects an unsigned or mis-signed callback before touching anything', async () => {
    const attempt = await payOrder(testApp, market.alice.token, order.id, 'timeout');

    const unsigned = await deliverCallback(testApp, successCallback(attempt), { signature: '' });
    const forged = await deliverCallback(testApp, successCallback(attempt), {
      signature: 'deadbeef'.repeat(8),
    });

    expect(unsigned.statusCode).toBe(400);
    expect(forged.statusCode).toBe(400);
    expect(errorCodeOf(forged)).toBe('PROVIDER_CALLBACK_REJECTED');
    expect((await readOrder(testApp, market.alice.token, order.id)).status).toBe(
      'awaiting_payment'
    );
    expect((await financialHistory(order.id)).entries).toHaveLength(0);
  });

  it('rejects a callback whose amount differs from the attempt', async () => {
    const attempt = await payOrder(testApp, market.alice.token, order.id, 'timeout');

    const response = await deliverCallback(testApp, {
      ...successCallback(attempt),
      amountMinor: 1,
    });

    expect(response.statusCode).toBe(400);
    expect((await financialHistory(order.id)).entries).toHaveLength(0);
  });

  it('rejects a callback for an unknown attempt', async () => {
    const response = await deliverCallback(testApp, {
      provider: 'simulated',
      providerEventId: 'evt_nope',
      attemptId: 'pay_nope',
      providerReference: 'sim_pay_nope',
      type: 'succeeded',
      amountMinor: 1,
      currency: 'SEK',
      failureReason: null,
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('Authorization (UC-004 E1)', () => {
  it('lets only the order’s buyer start a payment', async () => {
    const refused = await Promise.all(
      [market.dave.token, market.bo.token, market.adminToken].map((token) =>
        testApp.server.inject({
          method: 'POST',
          url: `/api/orders/${order.id}/pay`,
          headers: auth(token),
          payload: {},
        })
      )
    );
    for (const response of refused) {
      expect(response.statusCode).toBe(403);
    }

    const anonymous = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${order.id}/pay`,
      payload: {},
    });
    expect(anonymous.statusCode).toBe(401);
    expect(await attemptsFor(order.id)).toHaveLength(0);
  });

  it('shows attempts and financial history to platform admins only', async () => {
    await payOrder(testApp, market.alice.token, order.id);

    const urls = [`/api/orders/${order.id}/payments`, `/api/orders/${order.id}/financial-history`];
    const responses = await Promise.all(
      urls.flatMap((url) =>
        [market.alice.token, market.bo.token, market.adminToken].map(async (token) => ({
          token,
          response: await testApp.server.inject({ method: 'GET', url, headers: auth(token) }),
        }))
      )
    );
    for (const { token, response } of responses) {
      expect(response.statusCode).toBe(token === market.adminToken ? 200 : 403);
    }
  });
});
