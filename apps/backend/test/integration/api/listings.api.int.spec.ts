import {
  type Listing,
  type ListingDraft,
  type ListingListResponse,
  type SellerListingListResponse,
  listingDraftSchema,
  listingListResponseSchema,
  sellerListingListResponseSchema,
} from '@acme/api-contracts';
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
    const listing = listingDraftSchema.parse(response.json());
    expect(listing).toMatchObject({
      status: 'draft',
      organizationId: market.nordicOrgId,
      price: { amountMinor: 799_000, currency: 'SEK' },
      totalQuantity: 3,
      readiness: { ready: true, issues: [] },
    });
  });

  it('saves a draft that omits a required disclosure, and says what is missing', async () => {
    const payload = listingPayload();
    delete (payload as { condition?: unknown }).condition;

    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: sellerHeaders(),
      payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json<ListingDraft>().readiness).toEqual({
      ready: false,
      issues: [
        { path: 'condition.grade', message: 'Required to publish.' },
        { path: 'condition.guarantees.batteryHealthMinPercent', message: 'Required to publish.' },
        { path: 'condition.knownDefects', message: 'Required to publish.' },
      ],
    });
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
    expect(owner.json<ListingDraft>().status).toBe('draft');
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
    expect(sellerView.json<SellerListingListResponse>().items).toHaveLength(1);
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

    expect(
      nordic.json<SellerListingListResponse>().items.map((item) => item.organizationId)
    ).toEqual([market.nordicOrgId]);
    expect(
      baltic.json<SellerListingListResponse>().items.map((item) => item.organizationId)
    ).toEqual([market.balticOrgId]);

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
    expect(edited.json<ListingDraft>().price?.amountMinor).toBe(749_000);

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
    expect(tooLate.json<{ error: { code: string } }>().error.code).toBe('LISTING_STATE_CONFLICT');
  });
});

const createDraft = async (payload: Record<string, unknown>): Promise<ListingDraft> => {
  const response = await testApp.server.inject({
    method: 'POST',
    url: '/api/listings',
    headers: sellerHeaders(),
    payload,
  });
  if (response.statusCode !== 201) {
    throw new Error(`Failed to create draft: ${response.body}`);
  }
  return listingDraftSchema.parse(response.json());
};

const patchDraft = (listingId: string, payload: Record<string, unknown>) =>
  testApp.server.inject({
    method: 'PATCH',
    url: `/api/listings/${listingId}`,
    headers: sellerHeaders(),
    payload,
  });

const publish = (listingId: string) =>
  testApp.server.inject({
    method: 'POST',
    url: `/api/listings/${listingId}/publish`,
    headers: sellerHeaders(),
  });

describe('Incomplete drafts (P1-012; UC-005, UC-007, UC-008, UC-010)', () => {
  it('creates an empty draft, with every required field named as missing', async () => {
    const draft = await createDraft({});

    expect(draft).toMatchObject({
      status: 'draft',
      title: null,
      price: null,
      totalQuantity: null,
      specifications: { brand: null, storageType: null },
      condition: { grade: null, guarantees: { batteryHealthMinPercent: null } },
    });
    expect(draft.readiness.ready).toBe(false);
    expect(draft.readiness.issues).toHaveLength(15);
  });

  it('treats blank text as not entered rather than as a value', async () => {
    const draft = await createDraft({ title: '   ', description: 'Keeps this' });

    expect(draft.title).toBeNull();
    expect(draft.description).toBe('Keeps this');
  });

  it('still refuses a malformed value in an incomplete draft, naming the field', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: sellerHeaders(),
      payload: { title: 'Half done', condition: { guarantees: { batteryHealthMinPercent: 120 } } },
    });

    expect(response.statusCode).toBe(400);
    const error = response.json<{
      error: { code: string; details: { issues: { path: string }[] } };
    }>().error;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details.issues.map((issue) => issue.path)).toEqual([
      'condition.guarantees.batteryHealthMinPercent',
    ]);
  });

  it('refuses an inverted battery cycle range formed across two saves', async () => {
    const draft = await createDraft({ condition: { guarantees: { batteryCycleMax: 100 } } });

    const response = await patchDraft(draft.id, {
      condition: { guarantees: { batteryCycleMin: 400 } },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('INVALID_LISTING_DATA');
  });

  it('refuses to publish an incomplete draft, reporting every gap at once', async () => {
    const draft = await createDraft({ title: 'Half done', priceMinor: 650_000 });

    const response = await publish(draft.id);

    expect(response.statusCode).toBe(400);
    const error = response.json<{
      error: { code: string; details: { issues: { path: string; message: string }[] } };
    }>().error;
    expect(error.code).toBe('LISTING_INCOMPLETE');
    expect(error.details.issues).toEqual(draft.readiness.issues);
    expect(error.details.issues.map((issue) => issue.path)).not.toContain('title');
    expect(error.details.issues.map((issue) => issue.path)).not.toContain('priceMinor');

    const after = await testApp.server.inject({
      method: 'GET',
      url: `/api/listings/${draft.id}`,
      headers: sellerHeaders(),
    });
    expect(after.json<ListingDraft>().status).toBe('draft');

    const catalogue = await testApp.server.inject({ method: 'GET', url: '/api/listings' });
    expect(catalogue.json<ListingListResponse>().total).toBe(0);
  });

  it('completes a draft across several saves, merging nested fields, then publishes it', async () => {
    const full = listingPayload();
    const draft = await createDraft({
      title: full['title'],
      specifications: { brand: 'Lenovo', model: 'ThinkPad T14 Gen 3' },
    });

    const second = await patchDraft(draft.id, {
      description: full['description'],
      specifications: { cpu: 'Intel Core i5-1245U', ramGb: 16, storageType: 'nvme' },
      condition: { grade: 'A', knownDefects: 'none' },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json<ListingDraft>().specifications).toMatchObject({
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 3',
      cpu: 'Intel Core i5-1245U',
      storageGb: null,
    });

    const third = await patchDraft(draft.id, {
      specifications: { storageGb: 512, screenSizeInches: 14 },
      condition: { guarantees: { batteryHealthMinPercent: 92 } },
      priceMinor: 799_000,
      quantityTotal: 2,
      fulfillmentExpectations: full['fulfillmentExpectations'],
    });
    expect(third.json<ListingDraft>().readiness).toEqual({ ready: true, issues: [] });

    const published = await publish(draft.id);
    expect(published.statusCode).toBe(200);
    expect(published.json<Listing>()).toMatchObject({
      status: 'active',
      availableQuantity: 2,
      condition: { grade: 'A', guarantees: { batteryHealthMinPercent: 92 }, knownDefects: 'none' },
    });
  });

  it('clears a field with null, which makes the draft not ready again', async () => {
    const draft = await createDraft(listingPayload());
    expect(draft.readiness.ready).toBe(true);

    const cleared = await patchDraft(draft.id, { fulfillmentExpectations: null, priceMinor: null });

    expect(cleared.statusCode).toBe(200);
    const body = cleared.json<ListingDraft>();
    expect(body.fulfillmentExpectations).toBeNull();
    expect(body.price).toBeNull();
    expect(body.title).toBe(draft.title);
    expect(body.readiness.issues.map((issue) => issue.path)).toEqual([
      'priceMinor',
      'fulfillmentExpectations',
    ]);
  });

  it('lists drafts with readiness beside published listings, for every member role', async () => {
    await createDraft({ title: 'Half done' });
    await publishListing(testApp, market.bo.token);

    const asViewer = await testApp.server.inject({
      method: 'GET',
      url: '/api/seller/listings',
      headers: auth(market.maja.token),
    });

    expect(asViewer.statusCode).toBe(200);
    const page = sellerListingListResponseSchema.parse(asViewer.json());
    expect(page.items.map((item) => item.status).toSorted()).toEqual(['active', 'draft']);
    const draft = page.items.find((item) => item.status === 'draft');
    expect(draft?.status === 'draft' && draft.readiness.ready).toBe(false);

    // The catalogue only ever returns complete, published listings.
    const catalogue = await testApp.server.inject({ method: 'GET', url: '/api/listings' });
    expect(listingListResponseSchema.parse(catalogue.json()).total).toBe(1);
  });

  it('keeps an incomplete draft invisible to buyers and other organizations', async () => {
    const draft = await createDraft({ title: 'Half done' });

    const anonymous = await testApp.server.inject({
      method: 'GET',
      url: `/api/listings/${draft.id}`,
    });
    const otherSeller = await testApp.server.inject({
      method: 'GET',
      url: `/api/listings/${draft.id}`,
      headers: auth(market.jonas.token),
    });

    expect(anonymous.statusCode).toBe(404);
    expect(otherSeller.statusCode).toBe(404);
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
