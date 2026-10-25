import type {
  CurrentUser,
  ListingListResponse,
  Organization,
  OrganizationAuditResponse,
  OrganizationListResponse,
  OrganizationMemberListResponse,
} from '@acme/api-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Marketplace,
  type TestApp,
  auth,
  createTestApp,
  errorCodeOf,
  publishListing,
  seedMarketplace,
  signUp,
} from '../../helpers/test-app.ts';

/** UC-003: organizations, membership, roles, and marketplace-staff oversight. */
let testApp: TestApp;
let market: Marketplace;

beforeEach(async () => {
  testApp = await createTestApp();
  market = await seedMarketplace(testApp);
});

afterEach(async () => {
  await testApp.close();
});

const members = async (token: string, organizationId: string) =>
  testApp.server.inject({
    method: 'GET',
    url: `/api/organizations/${organizationId}/members`,
    headers: auth(token),
  });

describe('POST /api/organizations', () => {
  it('makes the creator an owner and shows up on their profile', async () => {
    const newcomer = await signUp(testApp, 'founder@example.com', 'Founder');

    const created = await testApp.server.inject({
      method: 'POST',
      url: '/api/organizations',
      headers: auth(newcomer.token),
      payload: { name: 'Fresh Refurb', description: 'Laptops from Malmö' },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json<Organization>()).toMatchObject({
      name: 'Fresh Refurb',
      status: 'active',
      memberCount: 1,
      deactivatedAt: null,
    });

    const me = await testApp.server.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: auth(newcomer.token),
    });
    expect(me.json<CurrentUser>().membership).toMatchObject({
      organizationName: 'Fresh Refurb',
      role: 'owner',
    });
  });

  it('refuses a second organization for someone who already belongs to one', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/organizations',
      headers: auth(market.bo.token),
      payload: { name: 'Side Business' },
    });

    expect(response.statusCode).toBe(409);
    expect(errorCodeOf(response)).toBe('ALREADY_IN_ORGANIZATION');
  });
});

describe('member management', () => {
  it('adds a registered user with the requested role', async () => {
    const newcomer = await signUp(testApp, 'newhire@nordic-refurb.example', 'New Hire');

    const added = await testApp.server.inject({
      method: 'POST',
      url: `/api/organizations/${market.nordicOrgId}/members`,
      headers: auth(market.bo.token),
      payload: { email: newcomer.email, role: 'manager' },
    });

    expect(added.statusCode).toBe(201);
    expect(added.json<OrganizationMemberListResponse>().items).toContainEqual(
      expect.objectContaining({ userId: newcomer.userId, role: 'manager' })
    );
  });

  it('refuses to add someone who has no account yet', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/organizations/${market.nordicOrgId}/members`,
      headers: auth(market.bo.token),
      payload: { email: 'stranger@example.com', role: 'viewer' },
    });

    expect(response.statusCode).toBe(404);
    expect(errorCodeOf(response)).toBe('USER_NOT_FOUND');
  });

  it('refuses to add someone who already belongs to another organization', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: `/api/organizations/${market.nordicOrgId}/members`,
      headers: auth(market.bo.token),
      payload: { email: market.jonas.email, role: 'viewer' },
    });

    expect(response.statusCode).toBe(409);
    expect(errorCodeOf(response)).toBe('ALREADY_IN_ORGANIZATION');
  });

  it('applies a role change on the member’s very next request', async () => {
    // Maja is a viewer, so she cannot publish.
    const before = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: auth(market.maja.token),
      payload: { title: 'x' },
    });
    expect(before.statusCode).toBe(403);

    await testApp.server.inject({
      method: 'PATCH',
      url: `/api/organizations/${market.nordicOrgId}/members/${market.maja.userId}`,
      headers: auth(market.bo.token),
      payload: { role: 'manager' },
    });

    // Same token, no re-issue: authorization is resolved per request (ADR-008).
    const after = await publishListing(testApp, market.maja.token);
    expect(after).toBeTruthy();
  });

  it('removes a member’s access immediately, leaving them an ordinary buyer', async () => {
    const removed = await testApp.server.inject({
      method: 'DELETE',
      url: `/api/organizations/${market.nordicOrgId}/members/${market.maja.userId}`,
      headers: auth(market.bo.token),
    });
    expect(removed.statusCode).toBe(200);

    const sellerView = await testApp.server.inject({
      method: 'GET',
      url: '/api/seller/listings',
      headers: auth(market.maja.token),
    });
    expect(sellerView.statusCode).toBe(403);
    expect(errorCodeOf(sellerView)).toBe('ORGANIZATION_REQUIRED');

    // Her account still works; she simply has no organization now.
    const me = await testApp.server.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: auth(market.maja.token),
    });
    expect(me.statusCode).toBe(200);
    expect(me.json<CurrentUser>().membership).toBeNull();
  });

  it('refuses to strip the last owner and refuses self-demotion', async () => {
    const demoteSelf = await testApp.server.inject({
      method: 'PATCH',
      url: `/api/organizations/${market.nordicOrgId}/members/${market.bo.userId}`,
      headers: auth(market.bo.token),
      payload: { role: 'viewer' },
    });

    expect(demoteSelf.statusCode).toBe(403);
    expect(errorCodeOf(demoteSelf)).toBe('SELF_MEMBERSHIP_CHANGE');

    // Promote Nils, then he can try to demote Bo — now allowed, because an owner remains.
    await testApp.server.inject({
      method: 'PATCH',
      url: `/api/organizations/${market.nordicOrgId}/members/${market.nils.userId}`,
      headers: auth(market.bo.token),
      payload: { role: 'owner' },
    });

    const demoteOther = await testApp.server.inject({
      method: 'PATCH',
      url: `/api/organizations/${market.nordicOrgId}/members/${market.bo.userId}`,
      headers: auth(market.nils.token),
      payload: { role: 'viewer' },
    });
    expect(demoteOther.statusCode).toBe(200);

    // Nils is now the only owner, so removing him is refused.
    const removeLastOwner = await testApp.server.inject({
      method: 'DELETE',
      url: `/api/organizations/${market.nordicOrgId}/members/${market.nils.userId}`,
      headers: auth(market.bo.token),
    });
    expect(removeLastOwner.statusCode).toBe(403);
  });

  /**
   * Two owners demoting each other at the same moment is the race that could leave an
   * organization ownerless. The aggregate's version guard must let at most one through.
   */
  it('keeps an owner when two concurrent demotions race', async () => {
    await testApp.server.inject({
      method: 'PATCH',
      url: `/api/organizations/${market.nordicOrgId}/members/${market.nils.userId}`,
      headers: auth(market.bo.token),
      payload: { role: 'owner' },
    });

    const [first, second] = await Promise.all([
      testApp.server.inject({
        method: 'PATCH',
        url: `/api/organizations/${market.nordicOrgId}/members/${market.nils.userId}`,
        headers: auth(market.bo.token),
        payload: { role: 'viewer' },
      }),
      testApp.server.inject({
        method: 'PATCH',
        url: `/api/organizations/${market.nordicOrgId}/members/${market.bo.userId}`,
        headers: auth(market.nils.token),
        payload: { role: 'viewer' },
      }),
    ]);

    const outcomes = [first.statusCode, second.statusCode].toSorted((a, b) => a - b);
    expect(outcomes[0]).toBe(200);
    expect(outcomes[1]).toBeGreaterThanOrEqual(400);

    const remaining = await members(market.bo.token, market.nordicOrgId);
    expect(
      remaining.json<OrganizationMemberListResponse>().items.some((m) => m.role === 'owner')
    ).toBe(true);
  });
});

describe('audit history', () => {
  it('records creation and every membership change in order', async () => {
    const response = await testApp.server.inject({
      method: 'GET',
      url: `/api/organizations/${market.nordicOrgId}/audit`,
      headers: auth(market.bo.token),
    });

    expect(response.statusCode).toBe(200);
    const entries = response.json<OrganizationAuditResponse>().items;
    expect(entries.map((entry) => entry.type)).toEqual([
      'organization_created',
      'member_added',
      'member_added',
    ]);
    expect(entries.map((entry) => entry.sequence)).toEqual([1, 2, 3]);
    expect(entries[1]?.actorUserId).toBe(market.bo.userId);
    expect(entries[1]?.summary).toContain('Member added');
  });
});

describe('marketplace staff oversight', () => {
  it('lists every organization and filters by status', async () => {
    const all = await testApp.server.inject({
      method: 'GET',
      url: '/api/admin/organizations',
      headers: auth(market.adminToken),
    });

    expect(all.statusCode).toBe(200);
    expect(all.json<OrganizationListResponse>().total).toBe(2);

    await testApp.server.inject({
      method: 'POST',
      url: `/api/admin/organizations/${market.balticOrgId}/deactivate`,
      headers: auth(market.adminToken),
      payload: { reason: 'Unresponsive seller' },
    });

    const active = await testApp.server.inject({
      method: 'GET',
      url: '/api/admin/organizations?status=active',
      headers: auth(market.adminToken),
    });
    expect(active.json<OrganizationListResponse>().items.map((item) => item.id)).toEqual([
      market.nordicOrgId,
    ]);
  });

  it('inspects another organization’s listings and orders', async () => {
    const listingId = await publishListing(testApp, market.bo.token);
    const order = await testApp.server.inject({
      method: 'POST',
      url: '/api/orders',
      headers: auth(market.alice.token),
      payload: { listingId },
    });
    const orderId = order.json<{ id: string }>().id;

    const listings = await testApp.server.inject({
      method: 'GET',
      url: `/api/admin/organizations/${market.nordicOrgId}/listings`,
      headers: auth(market.adminToken),
    });
    expect(listings.statusCode).toBe(200);
    expect(listings.json<ListingListResponse>().items).toHaveLength(1);

    // The operator order-inspection capability the roadmap calls for.
    const inspected = await testApp.server.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
      headers: auth(market.adminToken),
    });
    expect(inspected.statusCode).toBe(200);
    expect(inspected.json<{ id: string }>().id).toBe(orderId);
  });
});

const deactivate = () =>
  testApp.server.inject({
    method: 'POST',
    url: `/api/admin/organizations/${market.nordicOrgId}/deactivate`,
    headers: auth(market.adminToken),
    payload: { reason: 'Fraud investigation' },
  });

describe('deactivation freezes a seller without destroying anything', () => {
  it('hides listings from buyers, blocks new orders, and keeps existing orders intact', async () => {
    const listingId = await publishListing(testApp, market.bo.token, { quantityTotal: 5 });
    const existing = await testApp.server.inject({
      method: 'POST',
      url: '/api/orders',
      headers: auth(market.alice.token),
      payload: { listingId },
    });
    const existingOrderId = existing.json<{ id: string }>().id;

    expect((await deactivate()).statusCode).toBe(200);

    const catalogue = await testApp.server.inject({ method: 'GET', url: '/api/listings' });
    expect(catalogue.json<ListingListResponse>().total).toBe(0);

    const blocked = await testApp.server.inject({
      method: 'POST',
      url: '/api/orders',
      headers: auth(market.dave.token),
      payload: { listingId },
    });
    expect(blocked.statusCode).toBe(409);
    expect(errorCodeOf(blocked)).toBe('LISTING_UNAVAILABLE');

    // A shareable link to the listing stops working for buyers, too.
    const direct = await testApp.server.inject({
      method: 'GET',
      url: `/api/listings/${listingId}`,
      headers: auth(market.dave.token),
    });
    expect(direct.statusCode).toBe(404);

    // ...but staff and the seller's own members can still inspect it.
    const staffView = await testApp.server.inject({
      method: 'GET',
      url: `/api/listings/${listingId}`,
      headers: auth(market.adminToken),
    });
    expect(staffView.statusCode).toBe(200);

    // Nothing was deleted: the earlier order and its history are untouched.
    const stillThere = await testApp.server.inject({
      method: 'GET',
      url: `/api/orders/${existingOrderId}`,
      headers: auth(market.alice.token),
    });
    expect(stillThere.statusCode).toBe(200);
    expect(stillThere.json<{ status: string }>().status).toBe('awaiting_payment');
  });

  it('blocks seller writes but keeps reads working for members and staff', async () => {
    await publishListing(testApp, market.bo.token);
    await deactivate();

    const write = await testApp.server.inject({
      method: 'POST',
      url: '/api/listings',
      headers: auth(market.bo.token),
      payload: { title: 'nope' },
    });
    expect(write.statusCode).toBe(409);
    expect(errorCodeOf(write)).toBe('ORGANIZATION_STATE_CONFLICT');

    const addMemberWhileFrozen = await testApp.server.inject({
      method: 'POST',
      url: `/api/organizations/${market.nordicOrgId}/members`,
      headers: auth(market.bo.token),
      payload: { email: market.alice.email, role: 'viewer' },
    });
    expect(addMemberWhileFrozen.statusCode).toBe(409);

    const read = await testApp.server.inject({
      method: 'GET',
      url: '/api/seller/listings',
      headers: auth(market.bo.token),
    });
    expect(read.statusCode).toBe(200);
    expect(read.json<ListingListResponse>().items).toHaveLength(1);
  });

  it('restores the seller on reactivation', async () => {
    await publishListing(testApp, market.bo.token);
    await deactivate();

    const reactivated = await testApp.server.inject({
      method: 'POST',
      url: `/api/admin/organizations/${market.nordicOrgId}/reactivate`,
      headers: auth(market.adminToken),
      payload: { reason: 'Investigation closed' },
    });
    expect(reactivated.statusCode).toBe(200);
    expect(reactivated.json<Organization>().status).toBe('active');

    const catalogue = await testApp.server.inject({ method: 'GET', url: '/api/listings' });
    expect(catalogue.json<ListingListResponse>().total).toBe(1);
  });
});
