import {
  browseListingsResponseSchema,
  listingResponseSchema,
  orderResponseSchema,
} from '@acme/api-contracts';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildServer } from '../../../src/api/server.ts';
import { composeApp, type App } from '../../../src/bootstrap/compose-app.ts';
import {
  TEST_DATABASE_URL,
  isDatabaseAvailable,
  migrateToLatest,
  truncateAll,
} from '../helpers/test-db.ts';

const dbAvailable = await isDatabaseAvailable();
if (!dbAvailable) {
  process.stderr.write(
    `[uc-001 api tests] skipped: Postgres not reachable at ${TEST_DATABASE_URL}. ` +
      'Start it (docker compose up -d postgres) to run API integration tests.\n'
  );
}

const SELLER_ORG = 'demo-org';
const BUYER = 'demo-buyer';

const completeListing = {
  title: 'Lenovo ThinkPad T14 Gen 3',
  description: 'Refurbished business laptop in excellent condition',
  brand: 'Lenovo',
  model: 'ThinkPad T14 Gen 3',
  cpu: 'Ryzen 5 PRO 6650U',
  ram: '16 GB',
  storage: '512 GB NVMe SSD',
  screenSize: '14"',
  conditionGrade: 'A',
  conditionGuarantees: { batteryHealthMinPercent: 90, batteryCycleCountMax: 300 },
  knownDefects: 'none',
  priceOre: 549_900,
  quantity: 2,
  fulfillmentExpectations: 'Ships within 2 business days',
};

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

// Responses are parsed through the shared API contracts, so these tests also
// prove the backend honors the contract package.
const asListing = (res: LightMyRequestResponse) => listingResponseSchema.parse(res.json<unknown>());
const asOrder = (res: LightMyRequestResponse) => orderResponseSchema.parse(res.json<unknown>());
const asBrowse = (res: LightMyRequestResponse) =>
  browseListingsResponseSchema.parse(res.json<unknown>());
const asError = (res: LightMyRequestResponse) => errorEnvelopeSchema.parse(res.json<unknown>());

describe.skipIf(!dbAvailable)('UC-001: listing to order (API)', () => {
  let app: App;
  let server: FastifyInstance;

  beforeAll(async () => {
    await migrateToLatest();
    app = composeApp({ databaseUrl: TEST_DATABASE_URL });
    server = buildServer(app);
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
    await app.dispose();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  async function createOrder(listingId: string, buyerId = BUYER) {
    return server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { 'x-user-id': buyerId },
      payload: { listingId },
    });
  }

  async function publishListing(overrides: Record<string, unknown> = {}): Promise<string> {
    const draft = await server.inject({
      method: 'POST',
      url: '/api/v1/listings',
      headers: { 'x-organization-id': SELLER_ORG },
      payload: { ...completeListing, ...overrides },
    });
    expect(draft.statusCode).toBe(201);
    const { id } = asListing(draft);
    const published = await server.inject({
      method: 'POST',
      url: `/api/v1/listings/${id}/publish`,
      headers: { 'x-organization-id': SELLER_ORG },
    });
    expect(published.statusCode).toBe(200);
    return id;
  }

  it('runs the main flow: publish → browse → detail → order awaiting payment with timeline', async () => {
    const listingId = await publishListing();

    const browse = await server.inject({ method: 'GET', url: '/api/v1/listings?search=thinkpad' });
    expect(browse.statusCode).toBe(200);
    expect(asBrowse(browse).listings).toHaveLength(1);

    const detail = asListing(
      await server.inject({ method: 'GET', url: `/api/v1/listings/${listingId}` })
    );
    expect(detail.status).toBe('active');
    expect(detail.quantityAvailable).toBe(2);

    const orderRes = await createOrder(listingId);
    expect(orderRes.statusCode).toBe(201);
    const order = asOrder(orderRes);
    expect(order.status).toBe('awaiting_payment');
    expect(order.listingSnapshot.title).toBe(completeListing.title);
    expect(order.timeline).toHaveLength(1);
    expect(order.timeline[0]?.type).toBe('order_created');
    expect(order.timeline[0]?.nextStep).toContain('24 hours');
    expect(new Date(order.expiresAt).getTime()).toBeGreaterThan(Date.now());

    // Reservation is visible: available stock dropped.
    const afterOrder = asListing(
      await server.inject({ method: 'GET', url: `/api/v1/listings/${listingId}` })
    );
    expect(afterOrder.quantityAvailable).toBe(1);

    const fetched = await server.inject({
      method: 'GET',
      url: `/api/v1/orders/${order.id}`,
      headers: { 'x-user-id': BUYER },
    });
    expect(fetched.statusCode).toBe(200);
    expect(asOrder(fetched).id).toBe(order.id);
  });

  it('order snapshot is immutable: later listing archive does not change the order (A5)', async () => {
    const listingId = await publishListing();
    const order = asOrder(await createOrder(listingId));

    await server.inject({
      method: 'POST',
      url: `/api/v1/listings/${listingId}/archive`,
      headers: { 'x-organization-id': SELLER_ORG },
    });

    const browse = await server.inject({ method: 'GET', url: '/api/v1/listings' });
    expect(asBrowse(browse).listings).toHaveLength(0);

    const fetched = asOrder(
      await server.inject({
        method: 'GET',
        url: `/api/v1/orders/${order.id}`,
        headers: { 'x-user-id': BUYER },
      })
    );
    expect(fetched.status).toBe('awaiting_payment');
    expect(fetched.listingSnapshot.title).toBe(completeListing.title);
  });

  it('buyer cancel releases the reserved unit and is terminal (A1)', async () => {
    const listingId = await publishListing({ quantity: 1 });
    const order = asOrder(await createOrder(listingId));

    const cancelRes = await server.inject({
      method: 'POST',
      url: `/api/v1/orders/${order.id}/cancel`,
      headers: { 'x-user-id': BUYER },
    });
    expect(cancelRes.statusCode).toBe(200);
    const cancelled = asOrder(cancelRes);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancellationReason).toBe('buyer_cancelled');
    expect(cancelled.timeline.at(-1)?.type).toBe('order_cancelled');

    const listing = asListing(
      await server.inject({ method: 'GET', url: `/api/v1/listings/${listingId}` })
    );
    expect(listing.quantityAvailable).toBe(1);

    const again = await server.inject({
      method: 'POST',
      url: `/api/v1/orders/${order.id}/cancel`,
      headers: { 'x-user-id': BUYER },
    });
    expect(again.statusCode).toBe(409);
  });

  it('never oversells the last unit (A3)', async () => {
    const listingId = await publishListing({ quantity: 1 });

    const [first, second] = await Promise.all([
      createOrder(listingId, 'buyer-a'),
      createOrder(listingId, 'buyer-b'),
    ]);

    const statuses = [first.statusCode, second.statusCode].toSorted((a, b) => a - b);
    expect(statuses[0]).toBe(201);
    expect(statuses[1]).toBe(409);

    const listing = asListing(
      await server.inject({ method: 'GET', url: `/api/v1/listings/${listingId}` })
    );
    expect(listing.quantityAvailable).toBe(0);
  });

  it('rejects ordering from a non-active listing (A4) and publishing incomplete drafts (E1)', async () => {
    const draft = await server.inject({
      method: 'POST',
      url: '/api/v1/listings',
      headers: { 'x-organization-id': SELLER_ORG },
      payload: { title: 'Incomplete laptop' },
    });
    const draftId = asListing(draft).id;

    const orderFromDraft = await createOrder(draftId);
    expect(orderFromDraft.statusCode).toBe(409);

    const publish = await server.inject({
      method: 'POST',
      url: `/api/v1/listings/${draftId}/publish`,
      headers: { 'x-organization-id': SELLER_ORG },
    });
    expect(publish.statusCode).toBe(422);
    const publishError = asError(publish);
    expect(publishError.error.code).toBe('LISTING_NOT_PUBLISHABLE');
    const details = z
      .object({ missingFields: z.array(z.string()) })
      .parse(publishError.error.details);
    expect(details.missingFields).toContain('priceOre');
  });

  it('enforces ownership: other buyers cannot see or cancel the order; other orgs cannot manage the listing (E2)', async () => {
    const listingId = await publishListing();
    const order = asOrder(await createOrder(listingId));

    const foreignGet = await server.inject({
      method: 'GET',
      url: `/api/v1/orders/${order.id}`,
      headers: { 'x-user-id': 'someone-else' },
    });
    expect(foreignGet.statusCode).toBe(403);

    const foreignCancel = await server.inject({
      method: 'POST',
      url: `/api/v1/orders/${order.id}/cancel`,
      headers: { 'x-user-id': 'someone-else' },
    });
    expect(foreignCancel.statusCode).toBe(403);

    const foreignArchive = await server.inject({
      method: 'POST',
      url: `/api/v1/listings/${listingId}/archive`,
      headers: { 'x-organization-id': 'other-org' },
    });
    expect(foreignArchive.statusCode).toBe(403);
  });

  it('returns stable validation and not-found errors', async () => {
    const badBody = await server.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { 'x-user-id': BUYER },
      payload: {},
    });
    expect(badBody.statusCode).toBe(400);
    expect(asError(badBody).error.code).toBe('VALIDATION_ERROR');

    const missing = await server.inject({
      method: 'GET',
      url: '/api/v1/orders/00000000-0000-0000-0000-000000000000',
      headers: { 'x-user-id': BUYER },
    });
    expect(missing.statusCode).toBe(404);
  });
});
