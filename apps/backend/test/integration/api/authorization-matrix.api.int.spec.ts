import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Marketplace,
  type TestApp,
  auth,
  createTestApp,
  errorCodeOf,
  listingPayload,
  publishListing,
  seedMarketplace,
} from '../../helpers/test-app.ts';

/**
 * The authorization matrix: every protected route, against every kind of caller.
 *
 * This is the primary owning test for the "a seller can only ever reach their own organization"
 * guarantee. Deny cases matter at least as much as allow cases, so each route is exercised from
 * all six perspectives and the expectations are written out in full rather than derived — a
 * table that computed its own answers would drift along with the bug it is meant to catch.
 */
let testApp: TestApp;
let market: Marketplace;
let listingId: string;
let draftListingId: string;
let orderId: string;

beforeEach(async () => {
  testApp = await createTestApp();
  market = await seedMarketplace(testApp);

  listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 5 });

  const draft = await testApp.server.inject({
    method: 'POST',
    url: '/api/listings',
    headers: auth(market.bo.token),
    payload: listingPayload({ title: 'Unpublished draft' }),
  });
  draftListingId = draft.json<{ id: string }>().id;

  const order = await testApp.server.inject({
    method: 'POST',
    url: '/api/orders',
    headers: auth(market.alice.token),
    payload: { listingId },
  });
  orderId = order.json<{ id: string }>().id;
});

afterEach(async () => {
  await testApp.close();
});

/** Who can call. `anonymous` sends no token at all. */
type Caller = 'anonymous' | 'buyer' | 'owner' | 'manager' | 'viewer' | 'otherOrgOwner' | 'admin';

const ALL_CALLERS: readonly Caller[] = [
  'anonymous',
  'buyer',
  'owner',
  'manager',
  'viewer',
  'otherOrgOwner',
  'admin',
];

const headersFor = (caller: Caller): Record<string, string> => {
  const tokens: Record<Caller, string | null> = {
    anonymous: null,
    buyer: market.alice.token,
    owner: market.bo.token,
    manager: market.nils.token,
    viewer: market.maja.token,
    otherOrgOwner: market.jonas.token,
    admin: market.adminToken,
  };

  const token = tokens[caller];
  return token === null ? {} : auth(token);
};

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RouteCase {
  readonly name: string;
  readonly method: Method;
  readonly url: () => string;
  readonly payload?: () => Record<string, unknown>;
  /** Callers that must be allowed; every other caller must be refused. */
  readonly allowed: readonly Caller[];
}

const ROUTES: readonly RouteCase[] = [
  // --- Seller listing management ------------------------------------------------------------
  //
  // Two shapes here. Routes that name a listing act on *Nordic's* listing, so another
  // organization's owner must be refused. Routes without one act on the caller's own
  // organization, so `otherOrgOwner` is legitimately allowed — they create and read under
  // Baltic Devices, never under Nordic. The isolation that matters for those is proven by
  // 'shows a seller only their own organization' below.
  {
    name: 'POST /api/listings (own organization)',
    method: 'POST',
    url: () => '/api/listings',
    payload: () => listingPayload({ title: 'Matrix listing' }),
    allowed: ['owner', 'manager', 'otherOrgOwner'],
  },
  {
    name: 'PATCH /api/listings/:id',
    method: 'PATCH',
    url: () => `/api/listings/${draftListingId}`,
    payload: () => ({ priceMinor: 500_000 }),
    allowed: ['owner', 'manager'],
  },
  {
    name: 'POST /api/listings/:id/publish',
    method: 'POST',
    url: () => `/api/listings/${draftListingId}`.concat('/publish'),
    allowed: ['owner', 'manager'],
  },
  {
    name: 'POST /api/listings/:id/archive',
    method: 'POST',
    url: () => `/api/listings/${listingId}/archive`,
    allowed: ['owner', 'manager'],
  },
  {
    name: 'GET /api/seller/listings (own organization)',
    method: 'GET',
    url: () => '/api/seller/listings',
    allowed: ['owner', 'manager', 'viewer', 'otherOrgOwner'],
  },

  // --- Organization profile and membership --------------------------------------------------
  {
    name: 'GET /api/organizations/:id',
    method: 'GET',
    url: () => `/api/organizations/${market.nordicOrgId}`,
    allowed: ['owner', 'manager', 'viewer', 'admin'],
  },
  {
    name: 'PATCH /api/organizations/:id',
    method: 'PATCH',
    url: () => `/api/organizations/${market.nordicOrgId}`,
    payload: () => ({ name: 'Renamed' }),
    allowed: ['owner'],
  },
  {
    name: 'GET /api/organizations/:id/members',
    method: 'GET',
    url: () => `/api/organizations/${market.nordicOrgId}/members`,
    allowed: ['owner', 'manager', 'viewer', 'admin'],
  },
  {
    name: 'POST /api/organizations/:id/members',
    method: 'POST',
    url: () => `/api/organizations/${market.nordicOrgId}/members`,
    payload: () => ({ email: market.alice.email, role: 'viewer' }),
    allowed: ['owner'],
  },
  {
    name: 'PATCH /api/organizations/:id/members/:userId',
    method: 'PATCH',
    url: () => `/api/organizations/${market.nordicOrgId}/members/${market.maja.userId}`,
    payload: () => ({ role: 'manager' }),
    allowed: ['owner'],
  },
  {
    name: 'DELETE /api/organizations/:id/members/:userId',
    method: 'DELETE',
    url: () => `/api/organizations/${market.nordicOrgId}/members/${market.maja.userId}`,
    allowed: ['owner'],
  },
  {
    name: 'GET /api/organizations/:id/audit',
    method: 'GET',
    url: () => `/api/organizations/${market.nordicOrgId}/audit`,
    allowed: ['owner', 'manager', 'viewer', 'admin'],
  },

  // --- Marketplace staff only ---------------------------------------------------------------
  {
    name: 'GET /api/admin/organizations',
    method: 'GET',
    url: () => '/api/admin/organizations',
    allowed: ['admin'],
  },
  {
    name: 'GET /api/admin/organizations/:id/listings',
    method: 'GET',
    url: () => `/api/admin/organizations/${market.nordicOrgId}/listings`,
    allowed: ['admin'],
  },
  {
    name: 'POST /api/admin/organizations/:id/deactivate',
    method: 'POST',
    url: () => `/api/admin/organizations/${market.balticOrgId}/deactivate`,
    payload: () => ({ reason: 'Matrix check' }),
    allowed: ['admin'],
  },
  {
    name: 'POST /api/admin/organizations/:id/reactivate',
    method: 'POST',
    url: () => `/api/admin/organizations/${market.nordicOrgId}/reactivate`,
    payload: () => ({ reason: 'Matrix check' }),
    // Nordic Refurb is active, so staff get a 409 rather than a 403 — still "not refused for
    // authorization", which is what this matrix is about.
    allowed: ['admin'],
  },

  // --- Orders --------------------------------------------------------------------------------
  {
    name: 'POST /api/orders',
    method: 'POST',
    url: () => '/api/orders',
    payload: () => ({ listingId }),
    // Any signed-in person may buy, including sellers from any organization.
    allowed: ['buyer', 'owner', 'manager', 'viewer', 'otherOrgOwner', 'admin'],
  },
  {
    name: 'GET /api/orders/:id',
    method: 'GET',
    url: () => `/api/orders/${orderId}`,
    // The buyer, the selling organization, and marketplace staff.
    allowed: ['buyer', 'owner', 'manager', 'viewer', 'admin'],
  },
  {
    name: 'POST /api/orders/:id/cancel',
    method: 'POST',
    url: () => `/api/orders/${orderId}/cancel`,
    // Only the buyer who placed it.
    allowed: ['buyer'],
  },
  {
    name: 'GET /api/buyer/orders',
    method: 'GET',
    url: () => '/api/buyer/orders',
    allowed: ['buyer', 'owner', 'manager', 'viewer', 'otherOrgOwner', 'admin'],
  },
];

const ACCESS_DENIED = new Set([401, 403]);
/** A deactivated-organization conflict is also a refusal: the write never happened. */
const REFUSED = new Set([401, 403, 409]);

describe('authorization matrix', () => {
  for (const route of ROUTES) {
    for (const caller of ALL_CALLERS) {
      const shouldAllow = route.allowed.includes(caller);
      const verb = shouldAllow ? 'allows' : 'refuses';

      it(`${route.name} ${verb} ${caller}`, async () => {
        const method = route.method;
        const url = route.url();
        const headers = headersFor(caller);
        const payload = route.payload?.();

        const response =
          payload === undefined
            ? await testApp.server.inject({ method, url, headers })
            : await testApp.server.inject({ method, url, headers, payload });

        // Allowed callers must not be turned away by authentication or authorization, though
        // they may still hit a legitimate business conflict (409) — that is not a denial.
        const behavedCorrectly = shouldAllow
          ? !ACCESS_DENIED.has(response.statusCode)
          : REFUSED.has(response.statusCode);

        expect(
          behavedCorrectly,
          `${route.name} / ${caller}: status ${String(response.statusCode)} body ${response.body}`
        ).toBe(true);
      });
    }
  }
});

/** Either "you may not" or "it does not exist for you" keeps another organization opaque. */
const REFUSED_CROSS_ORG = new Set([403, 404]);

describe('cross-organization isolation', () => {
  it('never lets one organization reach another’s resources', async () => {
    const attempts = [
      { method: 'GET' as const, url: `/api/organizations/${market.nordicOrgId}` },
      { method: 'GET' as const, url: `/api/organizations/${market.nordicOrgId}/members` },
      { method: 'GET' as const, url: `/api/organizations/${market.nordicOrgId}/audit` },
      { method: 'GET' as const, url: `/api/listings/${draftListingId}` },
      { method: 'POST' as const, url: `/api/listings/${listingId}/archive` },
    ];

    const responses = await Promise.all(
      attempts.map((attempt) =>
        testApp.server.inject({ ...attempt, headers: auth(market.jonas.token) })
      )
    );

    const leaks = responses
      .map((response, index) => ({ response, attempt: attempts[index] }))
      .filter(({ response }) => !REFUSED_CROSS_ORG.has(response.statusCode))
      .map(({ response, attempt }) => `${attempt?.url ?? '?'} -> ${String(response.statusCode)}`);

    expect(leaks).toEqual([]);
  });

  it('shows a seller only their own organization in listings they can manage', async () => {
    const baltic = await publishListing(testApp, market.jonas.token, { title: 'Baltic laptop' });

    const nordicView = await testApp.server.inject({
      method: 'GET',
      url: '/api/seller/listings',
      headers: auth(market.bo.token),
    });

    const ids = nordicView.json<{ items: { id: string }[] }>().items.map((item) => item.id);
    expect(ids).toContain(listingId);
    expect(ids).not.toContain(baltic);
  });
});

describe('platform-admin standing cannot be obtained through the API', () => {
  it('exposes no route that grants it', async () => {
    const attempts = [
      { method: 'POST' as const, url: '/api/admin/users/promote' },
      { method: 'POST' as const, url: '/api/auth/platform-admin' },
      { method: 'PATCH' as const, url: `/api/admin/users/${market.bo.userId}` },
    ];

    const responses = await Promise.all(
      attempts.map((attempt) =>
        testApp.server.inject({
          ...attempt,
          headers: auth(market.adminToken),
          payload: { platformRole: 'platform_admin' },
        })
      )
    );

    expect(responses.map((response) => response.statusCode)).toEqual([404, 404, 404]);
  });

  it('does not let a seller role grant marketplace-wide access', async () => {
    const response = await testApp.server.inject({
      method: 'GET',
      url: '/api/admin/organizations',
      headers: auth(market.bo.token),
    });

    expect(response.statusCode).toBe(403);
    expect(errorCodeOf(response)).toBe('PLATFORM_ADMIN_REQUIRED');
  });

  it('does not let marketplace staff act as a seller', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: auth(market.adminToken),
      payload: listingPayload(),
    });

    expect(response.statusCode).toBe(403);
  });
});
