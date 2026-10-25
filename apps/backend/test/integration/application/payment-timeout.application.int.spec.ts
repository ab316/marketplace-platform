import type { Listing } from '@acme/api-contracts';
import { Money } from '@acme/core-domain';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Marketplace,
  type TestApp,
  createTestApp,
  payOrder,
  placeOrder,
  publishListing,
  readOrder,
  seedMarketplace,
} from '../../helpers/test-app.ts';

/**
 * Time-driven payment behavior (UC-004 A2 and the ADR-009 §3 recovery path) is tested through the
 * application commands with a controlled clock. Everything else is the real wiring.
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

const readListing = async (id: string): Promise<Listing> =>
  (await testApp.server.inject({ method: 'GET', url: `/api/listings/${id}` })).json<Listing>();

const timeoutSweep = () =>
  testApp.app.payments.api.expirePendingPaymentAttempts.execute({ limit: 100 });
const expirySweep = () => testApp.app.orders.expireOverdueOrders.execute({ limit: 100 });

describe('Payment timeout sweep (UC-004 A2)', () => {
  it('leaves a pending attempt alone before 15 minutes', async () => {
    const listingId = await publishListing(testApp, market.bo.token);
    const order = await placeOrder(testApp, market.alice.token, listingId);
    const attempt = await payOrder(testApp, market.alice.token, order.id, 'timeout');

    testApp.clock.advanceMinutes(14);
    const result = await timeoutSweep();

    expect(result).toEqual({
      timedOutAttemptIds: [],
      recoveredAttemptIds: [],
      failedAttemptIds: [],
    });
    expect((await readOrder(testApp, market.alice.token, order.id)).payment.status).toBe(
      'in_progress'
    );
    expect(attempt.status).toBe('pending');
  });

  it('times the attempt out at 15 minutes, records "Payment not completed", and clears the hold', async () => {
    const listingId = await publishListing(testApp, market.bo.token);
    const order = await placeOrder(testApp, market.alice.token, listingId);
    const attempt = await payOrder(testApp, market.alice.token, order.id, 'timeout');

    testApp.clock.advanceMinutes(15);
    const result = await timeoutSweep();

    expect(result.timedOutAttemptIds).toEqual([attempt.id]);
    const after = await readOrder(testApp, market.alice.token, order.id);
    expect(after.status).toBe('awaiting_payment');
    expect(after.payment).toMatchObject({ status: 'failed', holdUntil: null });
    expect(after.timeline[1]).toMatchObject({
      type: 'payment_failed',
      title: 'Payment not completed',
    });
    expect(after.timeline[1]?.description).toContain('did not respond');
  });

  it('is idempotent: a second sweep finds nothing', async () => {
    const listingId = await publishListing(testApp, market.bo.token);
    const order = await placeOrder(testApp, market.alice.token, listingId);
    await payOrder(testApp, market.alice.token, order.id, 'timeout');

    testApp.clock.advanceMinutes(15);
    await timeoutSweep();
    const second = await timeoutSweep();

    expect(second.timedOutAttemptIds).toEqual([]);
    expect((await readOrder(testApp, market.alice.token, order.id)).timeline).toHaveLength(2);
  });

  it('lets the buyer try again after a timeout', async () => {
    const listingId = await publishListing(testApp, market.bo.token);
    const order = await placeOrder(testApp, market.alice.token, listingId);
    await payOrder(testApp, market.alice.token, order.id, 'timeout');
    testApp.clock.advanceMinutes(15);
    await timeoutSweep();

    await payOrder(testApp, market.alice.token, order.id, 'success');

    expect((await readOrder(testApp, market.alice.token, order.id)).status).toBe(
      'paid_into_escrow'
    );
  });
});

describe('Payment hold against reservation expiry (PD-0004 §2)', () => {
  it('the expiry sweep skips an order with a payment in progress', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 1 });
    const order = await placeOrder(testApp, market.alice.token, listingId);

    // Pay in the last minute of the 24-hour window; the provider is slow.
    testApp.clock.advanceHours(24);
    testApp.clock.advanceMinutes(-1);
    await payOrder(testApp, market.alice.token, order.id, 'timeout');

    testApp.clock.advanceMinutes(5); // past the order's expiry, inside the hold
    const result = await expirySweep();

    expect(result.expiredOrderIds).toEqual([]);
    expect((await readOrder(testApp, market.alice.token, order.id)).status).toBe(
      'awaiting_payment'
    );
    expect((await readListing(listingId)).availableQuantity).toBe(0);
  });

  it('the order expires once the hold lapses without an answer', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 1 });
    const order = await placeOrder(testApp, market.alice.token, listingId);
    testApp.clock.advanceHours(24);
    testApp.clock.advanceMinutes(-1);
    await payOrder(testApp, market.alice.token, order.id, 'timeout');

    testApp.clock.advanceMinutes(15);
    await timeoutSweep();
    const result = await expirySweep();

    expect(result.expiredOrderIds).toEqual([order.id]);
    expect((await readOrder(testApp, market.alice.token, order.id)).status).toBe('cancelled');
    expect((await readListing(listingId)).availableQuantity).toBe(1);
  });

  it('a payment that succeeds inside the hold wins over expiry', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 1 });
    const order = await placeOrder(testApp, market.alice.token, listingId);
    testApp.clock.advanceHours(24);
    testApp.clock.advanceMinutes(-1);

    await payOrder(testApp, market.alice.token, order.id, 'success');
    testApp.clock.advanceMinutes(30);
    const result = await expirySweep();

    expect(result.expiredOrderIds).toEqual([]);
    expect((await readOrder(testApp, market.alice.token, order.id)).status).toBe(
      'paid_into_escrow'
    );
    expect(await readListing(listingId)).toMatchObject({ soldQuantity: 1, availableQuantity: 0 });
  });
});

describe('Recovery after a partial success (ADR-009 §3)', () => {
  it('settles an attempt whose capture was posted but never applied, instead of timing it out', async () => {
    const listingId = await publishListing(testApp, market.bo.token);
    const order = await placeOrder(testApp, market.alice.token, listingId);
    const attempt = await payOrder(testApp, market.alice.token, order.id, 'timeout');

    // Simulate the handler dying after step 2: money is in escrow, the order and attempt are not updated.
    await testApp.app.ledger.postJournalEntry.execute({
      idempotencyKey: `payment:${attempt.id}:captured`,
      kind: 'payment_captured',
      reference: { type: 'order', id: order.id },
      description: 'Payment captured into escrow',
      lines: [
        {
          account: { kind: 'provider_clearing', ownerId: 'simulated' },
          side: 'debit',
          amount: Money.fromMinor(799_000),
        },
        {
          account: { kind: 'order_escrow', ownerId: order.id },
          side: 'credit',
          amount: Money.fromMinor(799_000),
        },
      ],
    });

    testApp.clock.advanceMinutes(15);
    const result = await timeoutSweep();

    expect(result.recoveredAttemptIds).toEqual([attempt.id]);
    expect(result.timedOutAttemptIds).toEqual([]);
    const after = await readOrder(testApp, market.alice.token, order.id);
    expect(after.status).toBe('paid_into_escrow');
    expect(after.payment.attemptId).toBe(attempt.id);
    expect((await readListing(listingId)).soldQuantity).toBe(1);
    const escrow = await testApp.app.ledger.getAccountBalance.execute({
      kind: 'order_escrow',
      ownerId: order.id,
    });
    expect(escrow.balanceMinor).toBe(799_000);
  });
});
