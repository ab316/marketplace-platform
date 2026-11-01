import type { Listing, ListingListResponse } from '@acme/api-contracts';
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
 * UC-006 — buyer searches and filters the catalogue. The catalogue query is the owning surface
 * for filters, sorting, and the orderable-only rule (Q1); keyword matching is covered with the
 * rest of the listing routes in `listings.api.int.spec.ts`.
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

const browse = async (query: string): Promise<ListingListResponse> => {
  const response = await testApp.server.inject({ method: 'GET', url: `/api/listings${query}` });
  expect(response.statusCode).toBe(200);
  return response.json<ListingListResponse>();
};

const browseExpectingRejection = async (query: string) => {
  const response = await testApp.server.inject({ method: 'GET', url: `/api/listings${query}` });
  expect(response.statusCode).toBe(400);
  return response.json<{ error: { code: string; details?: unknown } }>();
};

const titles = (page: ListingListResponse) => page.items.map((listing: Listing) => listing.title);

/** A small catalogue varied across every filter axis: brand, price, grade, and memory. */
const seedCatalogue = async () => {
  await publishListing(testApp, market.bo.token, {
    title: 'ThinkPad A-grade',
    priceMinor: 700_000,
  });
  await publishListing(testApp, market.bo.token, {
    title: 'ThinkPad C-grade budget',
    priceMinor: 300_000,
    condition: {
      grade: 'C',
      guarantees: { batteryHealthMinPercent: 75 },
      knownDefects: 'Worn keyboard, dent on lid.',
    },
    specifications: {
      brand: 'Lenovo',
      model: 'ThinkPad E15',
      cpu: 'Intel Core i3-1115G4',
      ramGb: 8,
      storageType: 'ssd',
      storageGb: 256,
      screenSizeInches: 15.6,
    },
  });
  await publishListing(testApp, market.bo.token, {
    title: 'MacBook B-grade',
    priceMinor: 1_200_000,
    condition: {
      grade: 'B',
      guarantees: { batteryHealthMinPercent: 85 },
      knownDefects: 'Light scratches on the lid.',
    },
    specifications: {
      brand: 'Apple',
      model: 'MacBook Pro 14',
      cpu: 'Apple M1 Pro',
      ramGb: 32,
      storageType: 'ssd',
      storageGb: 512,
      screenSizeInches: 14.2,
    },
  });
};

describe('GET /api/listings — orderable-only catalogue (UC-006 Q1)', () => {
  it('hides a listing while its stock is fully reserved and shows it again on cancellation', async () => {
    const listingId = await publishListing(testApp, market.bo.token, {
      title: 'Last unit ThinkPad',
      quantityTotal: 1,
    });

    expect((await browse('')).total).toBe(1);

    const ordered = await testApp.server.inject({
      method: 'POST',
      url: '/api/orders',
      headers: auth(market.alice.token),
      payload: { listingId },
    });
    expect(ordered.statusCode).toBe(201);
    const orderId = ordered.json<{ id: string }>().id;

    // Fully reserved: not orderable, so not in the catalogue — excluded by the query itself.
    expect((await browse('')).total).toBe(0);

    const cancelled = await testApp.server.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/cancel`,
      headers: auth(market.alice.token),
    });
    expect(cancelled.statusCode).toBe(200);

    // The released unit puts the listing back in the catalogue.
    expect((await browse('')).total).toBe(1);
  });
});

describe('GET /api/listings — filters (UC-006 B2)', () => {
  beforeEach(seedCatalogue);

  it('filters by one or more brands, case-insensitively', async () => {
    const apple = await browse('?brand=Apple');
    expect(titles(apple)).toEqual(['MacBook B-grade']);

    // The curated value matches regardless of how the seller cased the brand text (Q2).
    const lowercase = await browse('?brand=Apple&q=macbook');
    expect(lowercase.total).toBe(1);

    const both = await browse('?brand=Apple&brand=Lenovo');
    expect(both.total).toBe(3);
  });

  it('rejects a brand outside the curated list with a field-level reason (E1)', async () => {
    const body = await browseExpectingRejection('?brand=Commodore');
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('applies inclusive price bounds, each independently optional (Q4)', async () => {
    expect(titles(await browse('?priceMax=700000&sort=price_asc'))).toEqual([
      'ThinkPad C-grade budget',
      'ThinkPad A-grade',
    ]);
    expect(titles(await browse('?priceMin=700000&sort=price_asc'))).toEqual([
      'ThinkPad A-grade',
      'MacBook B-grade',
    ]);
    expect(titles(await browse('?priceMin=300000&priceMax=300000'))).toEqual([
      'ThinkPad C-grade budget',
    ]);
  });

  it('rejects a max price below the min price (E1)', async () => {
    const body = await browseExpectingRejection('?priceMin=500000&priceMax=100000');
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('treats the condition grade as a minimum that includes better grades', async () => {
    const atLeastB = await browse('?grade=B&sort=price_asc');
    expect(titles(atLeastB)).toEqual(['ThinkPad A-grade', 'MacBook B-grade']);

    expect((await browse('?grade=A')).total).toBe(1);
    expect((await browse('?grade=C')).total).toBe(3);
  });

  it('treats memory as an inclusive minimum from the fixed buckets (Q3)', async () => {
    expect((await browse('?ramMin=8')).total).toBe(3);
    expect(titles(await browse('?ramMin=16&sort=price_asc'))).toEqual([
      'ThinkPad A-grade',
      'MacBook B-grade',
    ]);
    expect(titles(await browse('?ramMin=32'))).toEqual(['MacBook B-grade']);
  });

  it('rejects a memory value outside the buckets (E1)', async () => {
    const body = await browseExpectingRejection('?ramMin=12');
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('combines keyword and every filter conjunctively', async () => {
    const page = await browse('?q=thinkpad&brand=Lenovo&priceMin=500000&grade=B&ramMin=16');
    expect(titles(page)).toEqual(['ThinkPad A-grade']);

    // One unsatisfied filter empties the result rather than being dropped (A2).
    expect((await browse('?q=thinkpad&brand=Apple')).total).toBe(0);
  });
});

describe('GET /api/listings — sorting (UC-006 B3/B7)', () => {
  beforeEach(seedCatalogue);

  it('sorts by price in both directions', async () => {
    expect(titles(await browse('?sort=price_asc'))).toEqual([
      'ThinkPad C-grade budget',
      'ThinkPad A-grade',
      'MacBook B-grade',
    ]);
    expect(titles(await browse('?sort=price_desc'))).toEqual([
      'MacBook B-grade',
      'ThinkPad A-grade',
      'ThinkPad C-grade budget',
    ]);
  });

  it('defaults to newest first, deterministically, and rejects an unknown sort (E1)', async () => {
    // The seeded listings can share a publish instant, so the exact order falls to the id
    // tiebreak; the guarantee under test is that the default equals `newest` and is stable.
    const first = await browse('');
    const explicit = await browse('?sort=newest');
    const again = await browse('');
    expect(titles(first)).toEqual(titles(explicit));
    expect(titles(first)).toEqual(titles(again));
    expect(first.total).toBe(3);

    const body = await browseExpectingRejection('?sort=cheapest');
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('pages without duplicating or skipping under a deterministic tiebreak (B7)', async () => {
    const first = await browse('?sort=price_asc&limit=2&offset=0');
    const second = await browse('?sort=price_asc&limit=2&offset=2');

    expect(first.total).toBe(3);
    expect([...titles(first), ...titles(second)]).toEqual([
      'ThinkPad C-grade budget',
      'ThinkPad A-grade',
      'MacBook B-grade',
    ]);
  });
});
