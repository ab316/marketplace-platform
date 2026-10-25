import type { Listing, ListingListResponse } from '@acme/api-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Marketplace,
  type TestApp,
  auth,
  createTestApp,
  listingPayload,
  publishListing,
  seedMarketplace,
} from '../../helpers/test-app.ts';

let testApp: TestApp;
let market: Marketplace;

beforeEach(async () => {
  testApp = await createTestApp();
  market = await seedMarketplace(testApp);
});

afterEach(async () => {
  await testApp.close();
});

/** Bo owns Nordic Refurb and may manage its listings. */
const sellerHeaders = () => auth(market.bo.token);

describe('POST /api/listings', () => {
  it('creates a draft that is not yet orderable', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: sellerHeaders(),
      payload: listingPayload(),
    });

    expect(response.statusCode).toBe(201);
    const listing = response.json<Listing>();
    expect(listing).toMatchObject({
      status: 'draft',
      organizationId: market.nordicOrgId,
      price: { amountMinor: 799_000, currency: 'SEK' },
      totalQuantity: 3,
      reservedQuantity: 0,
      availableQuantity: 3,
      publishedAt: null,
    });
  });

  it('rejects a listing that omits a required disclosure', async () => {
    const payload = listingPayload();
    delete (payload as { condition?: unknown }).condition;

    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: sellerHeaders(),
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a price in any currency other than SEK', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: sellerHeaders(),
      payload: { ...listingPayload(), currency: 'EUR' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a listing with no stock', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: sellerHeaders(),
      payload: listingPayload({ quantityTotal: 0 }),
    });

    expect(response.statusCode).toBe(400);
  });

  it('requires an authenticated actor', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      payload: listingPayload(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('refuses an organization member whose role cannot manage listings', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: auth(market.maja.token),
      payload: listingPayload(),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      'ORGANIZATION_ACCESS_DENIED'
    );
  });
});

describe('Publishing and archiving', () => {
  it('makes a published listing visible in the catalogue', async () => {
    const listingId = await publishListing(testApp, market.bo.token);

    const browse = await testApp.server.inject({ method: 'GET', url: '/api/listings' });

    expect(browse.statusCode).toBe(200);
    const page = browse.json<ListingListResponse>();
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ id: listingId, status: 'active' });
  });

  it('keeps drafts out of the catalogue and hidden from other organizations', async () => {
    const created = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: sellerHeaders(),
      payload: listingPayload(),
    });
    const listingId = created.json<Listing>().id;

    const browse = await testApp.server.inject({ method: 'GET', url: '/api/listings' });
    expect(browse.json<ListingListResponse>().total).toBe(0);

    const anonymous = await testApp.server.inject({
      method: 'GET',
      url: `/api/listings/${listingId}`,
    });
    expect(anonymous.statusCode).toBe(404);

    const owner = await testApp.server.inject({
      method: 'GET',
      url: `/api/listings/${listingId}`,
      headers: sellerHeaders(),
    });
    expect(owner.statusCode).toBe(200);
    expect(owner.json<Listing>().status).toBe('draft');
  });

  it('refuses to publish another organization’s listing', async () => {
    const created = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: sellerHeaders(),
      payload: listingPayload(),
    });
    const listingId = created.json<Listing>().id;

    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/listings/${listingId}/publish`,
      headers: auth(market.jonas.token),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('LISTING_ACCESS_DENIED');
  });

  it('refuses to publish the same listing twice', async () => {
    const listingId = await publishListing(testApp, market.bo.token);

    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/listings/${listingId}/publish`,
      headers: sellerHeaders(),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('LISTING_STATE_CONFLICT');
  });

  it('removes an archived listing from the catalogue but keeps it for the seller', async () => {
    const listingId = await publishListing(testApp, market.bo.token);

    const archived = await testApp.server.inject({
      method: 'POST',
      url: `/api/listings/${listingId}/archive`,
      headers: sellerHeaders(),
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json<Listing>().status).toBe('archived');

    const browse = await testApp.server.inject({ method: 'GET', url: '/api/listings' });
    expect(browse.json<ListingListResponse>().total).toBe(0);

    const sellerView = await testApp.server.inject({
      method: 'GET',
      url: '/api/seller/listings',
      headers: sellerHeaders(),
    });
    expect(sellerView.json<ListingListResponse>().items).toHaveLength(1);
  });

  it('shows a seller only their own organization’s listings', async () => {
    await publishListing(testApp, market.bo.token);
    await publishListing(testApp, market.jonas.token, {
      title: 'Dell Latitude 5430 — refurbished',
    });

    const nordic = await testApp.server.inject({
      method: 'GET',
      url: '/api/seller/listings',
      headers: auth(market.bo.token),
    });
    const baltic = await testApp.server.inject({
      method: 'GET',
      url: '/api/seller/listings',
      headers: auth(market.jonas.token),
    });

    expect(nordic.json<ListingListResponse>().items.map((item) => item.organizationId)).toEqual([
      market.nordicOrgId,
    ]);
    expect(baltic.json<ListingListResponse>().items.map((item) => item.organizationId)).toEqual([
      market.balticOrgId,
    ]);

    // Both are public, so the shared catalogue still shows them together.
    const catalogue = await testApp.server.inject({ method: 'GET', url: '/api/listings' });
    expect(catalogue.json<ListingListResponse>().total).toBe(2);
  });

  it('only allows editing before publication', async () => {
    const created = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: sellerHeaders(),
      payload: listingPayload(),
    });
    const listingId = created.json<Listing>().id;

    const edited = await testApp.server.inject({
      method: 'PATCH',
      url: `/api/listings/${listingId}`,
      headers: sellerHeaders(),
      payload: { priceMinor: 749_000 },
    });
    expect(edited.statusCode).toBe(200);
    expect(edited.json<Listing>().price.amountMinor).toBe(749_000);

    await testApp.server.inject({
      method: 'POST',
      url: `/api/listings/${listingId}/publish`,
      headers: sellerHeaders(),
    });

    const tooLate = await testApp.server.inject({
      method: 'PATCH',
      url: `/api/listings/${listingId}`,
      headers: sellerHeaders(),
      payload: { priceMinor: 100_000 },
    });
    expect(tooLate.statusCode).toBe(409);
  });
});

describe('GET /api/listings', () => {
  it('matches a keyword against the title, description, brand, and model', async () => {
    await publishListing(testApp, market.bo.token);
    await publishListing(testApp, market.bo.token, {
      title: 'MacBook Air M1 — refurbished',
      specifications: {
        brand: 'Apple',
        model: 'MacBook Air M1',
        cpu: 'Apple M1',
        ramGb: 8,
        storageType: 'ssd',
        storageGb: 256,
        screenSizeInches: 13.3,
      },
    });

    const byBrand = await testApp.server.inject({ method: 'GET', url: '/api/listings?q=apple' });
    expect(byBrand.json<ListingListResponse>().total).toBe(1);

    const byTitle = await testApp.server.inject({ method: 'GET', url: '/api/listings?q=thinkpad' });
    expect(byTitle.json<ListingListResponse>().total).toBe(1);

    const noMatch = await testApp.server.inject({ method: 'GET', url: '/api/listings?q=desktop' });
    expect(noMatch.json<ListingListResponse>().total).toBe(0);
  });

  it('returns 404 for an unknown listing', async () => {
    const response = await testApp.server.inject({ method: 'GET', url: '/api/listings/lst_nope' });

    expect(response.statusCode).toBe(404);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('LISTING_NOT_FOUND');
  });
});
