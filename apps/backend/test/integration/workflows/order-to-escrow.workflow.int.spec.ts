import type { Listing, OrderFinancialHistoryResponse } from '@acme/api-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Marketplace,
  type TestApp,
  auth,
  createTestApp,
  payOrder,
  placeOrder,
  publishListing,
  readOrder,
  seedMarketplace,
} from '../../helpers/test-app.ts';

/**
 * The Phase 4 trust loop end to end — publish → order → pay → paid into escrow — across three
 * buyers and two orders, ending with a ledger that balances and an escrow per order equal to its
 * total. Roadmap Phase 4 success metric.
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

describe('Order to escrow workflow', () => {
  it('leaves money, stock, order state, and history consistent across mixed outcomes', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 3 });

    const aliceOrder = await placeOrder(testApp, market.alice.token, listingId);
    const daveOrder = await placeOrder(testApp, market.dave.token, listingId);

    // Alice pays successfully; Dave's first attempt fails, then succeeds.
    await payOrder(testApp, market.alice.token, aliceOrder.id, 'success');
    await payOrder(testApp, market.dave.token, daveOrder.id, 'failure');
    await payOrder(testApp, market.dave.token, daveOrder.id, 'duplicate_success');

    const alice = await readOrder(testApp, market.alice.token, aliceOrder.id);
    const dave = await readOrder(testApp, market.dave.token, daveOrder.id);
    expect(alice.status).toBe('paid_into_escrow');
    expect(dave.status).toBe('paid_into_escrow');
    expect(dave.timeline.map((entry) => entry.type)).toEqual([
      'order_created',
      'payment_failed',
      'payment_secured',
    ]);

    const listing = (
      await testApp.server.inject({ method: 'GET', url: `/api/listings/${listingId}` })
    ).json<Listing>();
    expect(listing).toMatchObject({
      totalQuantity: 3,
      reservedQuantity: 0,
      soldQuantity: 2,
      availableQuantity: 1,
    });

    // Each escrow holds exactly its order's total.
    const histories = await Promise.all(
      [alice, dave].map(async (order) => ({
        order,
        history: (
          await testApp.server.inject({
            method: 'GET',
            url: `/api/orders/${order.id}/financial-history`,
            headers: auth(market.adminToken),
          })
        ).json<OrderFinancialHistoryResponse>(),
      }))
    );
    for (const { order, history } of histories) {
      expect(history.escrowBalance.amountMinor).toBe(order.total.amountMinor);
      expect(history.entries).toHaveLength(1);
    }

    // The ledger balances: what the provider holds equals what escrow owes, and a rebuild from
    // the journal reproduces every balance.
    const provider = await testApp.app.ledger.getAccountBalance.execute({
      kind: 'provider_clearing',
      ownerId: 'simulated',
    });
    expect(provider.balanceMinor).toBe(alice.total.amountMinor + dave.total.amountMinor);

    const rebuilt = await testApp.app.ledger.rebuildAccountBalances.execute();
    const escrowTotal = rebuilt
      .filter((balance) => balance.account.kind === 'order_escrow')
      .reduce((sum, balance) => sum + balance.balanceMinor, 0);
    const providerRebuilt = rebuilt.find((balance) => balance.account.kind === 'provider_clearing');
    expect(escrowTotal).toBe(providerRebuilt?.balanceMinor);
    expect(providerRebuilt?.balanceMinor).toBe(provider.balanceMinor);
  });
});
