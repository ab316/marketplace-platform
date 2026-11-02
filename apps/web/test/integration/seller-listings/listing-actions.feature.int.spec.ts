import type { CreateListingRequest } from '@acme/api-contracts';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { activeListing, makeListing } from '../../fixtures/listing.ts';
import { BACKEND_URL } from '../../msw/handlers.ts';
import { server } from '../../msw/server.ts';

/**
 * Integration tests for the seller-listing Server Actions (UC-007 create/edit/publish, UC-008
 * archive): the real actions, data layer, and contract schemas, the backend simulated at the HTTP
 * boundary. Owns the design contract's error mapping — 401 → sign-in, 403/404 → the listing
 * route (not-found), 409 state conflict → the detail page, 409 organization conflict and 400 →
 * banner, 429 → rate-limit banner, failure → generic banner — and the revalidation on success.
 *
 * `next/headers`, `next/cache`, and `next/navigation` only exist inside a Next.js request scope,
 * so all three are substituted at that boundary, exactly like the organization suite.
 */

const cookieJar = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieJar.store.get(name);
        return value === undefined ? undefined : { name, value };
      },
      set: (name: string, value: string) => {
        cookieJar.store.set(name, value);
      },
      delete: (name: string) => {
        cookieJar.store.delete(name);
      },
    }),
}));

const redirected = vi.hoisted(() => ({ location: undefined as string | undefined }));
const revalidated = vi.hoisted(() => ({ paths: [] as string[] }));

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => {
    revalidated.paths.push(path);
  },
}));

vi.mock('next/navigation', () => ({
  redirect: (location: string): never => {
    redirected.location = location;
    throw new Error(`NEXT_REDIRECT:${location}`);
  },
}));

const { createListingAction, updateListingAction, publishListingAction, archiveListingAction } =
  await import('../../../src/features/seller-listings/actions.ts');

const REQUEST: CreateListingRequest = {
  title: 'ThinkPad T14 Gen 3',
  description: 'Off-lease business laptops, fully refurbished.',
  specifications: {
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 3',
    cpu: 'AMD Ryzen 5 PRO 6650U',
    ramGb: 16,
    storageType: 'nvme',
    storageGb: 256,
    screenSizeInches: 14,
  },
  condition: {
    grade: 'B',
    guarantees: { batteryHealthMinPercent: 85 },
    knownDefects: 'none',
  },
  priceMinor: 749_000,
  currency: 'SEK',
  quantityTotal: 12,
  fulfillmentExpectations: 'Ships in 2 days.',
};

const envelope = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status });

const expectRedirect = async (run: () => Promise<unknown>): Promise<string | undefined> => {
  redirected.location = undefined;
  await expect(run()).rejects.toThrow(/NEXT_REDIRECT/);
  return redirected.location;
};

beforeEach(() => {
  cookieJar.store.clear();
  cookieJar.store.set('marketplace_session', 'opaque-token-123');
  redirected.location = undefined;
  revalidated.paths.length = 0;
});

describe('createListingAction', () => {
  it('posts the contract body with the session and redirects to the new draft', async () => {
    const created = makeListing({ id: 'lst_new' });
    let received: { body: unknown; authorization: string | null } | undefined;
    server.use(
      http.post(`${BACKEND_URL}/api/listings`, async ({ request }) => {
        received = {
          body: await request.json(),
          authorization: request.headers.get('authorization'),
        };
        return HttpResponse.json(created, { status: 201 });
      })
    );

    const location = await expectRedirect(() => createListingAction(REQUEST));

    expect(location).toBe('/seller/listings/lst_new');
    expect(revalidated.paths).toContain('/seller/listings');
    expect(received?.body).toEqual(REQUEST);
    expect(received?.authorization).toBe('Bearer opaque-token-123');
  });

  it('rejects an input the contract schema refuses without calling the backend', async () => {
    let called = false;
    server.use(
      http.post(`${BACKEND_URL}/api/listings`, () => {
        called = true;
        return HttpResponse.json(makeListing(), { status: 201 });
      })
    );

    const result = await createListingAction({ ...REQUEST, priceMinor: 0 });

    expect(result.formError).toMatch(/not valid/);
    expect(called).toBe(false);
  });

  it('sends a dead session to sign-in with the new-listing page as next', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings`, () =>
        envelope(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.')
      )
    );

    const location = await expectRedirect(() => createListingAction(REQUEST));

    expect(location).toBe('/sign-in?next=%2Fseller%2Flistings%2Fnew');
  });

  it('sends a forbidden member to the list, which explains why', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings`, () =>
        envelope(403, 'ORGANIZATION_ACCESS_DENIED', 'You cannot manage listings.')
      )
    );

    const location = await expectRedirect(() => createListingAction(REQUEST));

    expect(location).toBe('/seller/listings');
  });

  it("shows the backend's message for a deactivated organization (UC-007 E3)", async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings`, () =>
        envelope(
          409,
          'ORGANIZATION_STATE_CONFLICT',
          'This organization is deactivated and cannot be changed. Contact marketplace staff.'
        )
      )
    );

    const result = await createListingAction(REQUEST);

    expect(result.formError).toMatch(/deactivated/);
  });

  it('maps a 429 to the rate-limit banner and a transport failure to the generic one', async () => {
    server.use(
      http.post(
        `${BACKEND_URL}/api/listings`,
        () => new HttpResponse('Too Many Requests', { status: 429 })
      )
    );
    expect((await createListingAction(REQUEST)).formError).toMatch(/Too many attempts/);

    server.use(http.post(`${BACKEND_URL}/api/listings`, () => HttpResponse.error()));
    expect((await createListingAction(REQUEST)).formError).toMatch(/Something went wrong/);
  });
});

describe('updateListingAction', () => {
  it('patches the draft, revalidates list, detail, and catalogue, and redirects to detail', async () => {
    let method: string | undefined;
    server.use(
      http.patch(`${BACKEND_URL}/api/listings/lst_7`, ({ request }) => {
        method = request.method;
        return HttpResponse.json(makeListing({ id: 'lst_7' }));
      })
    );

    const location = await expectRedirect(() => updateListingAction('lst_7', REQUEST));

    expect(method).toBe('PATCH');
    expect(location).toBe('/seller/listings/lst_7');
    expect(revalidated.paths).toEqual(
      expect.arrayContaining(['/seller/listings', '/seller/listings/lst_7', '/listings'])
    );
  });

  it('sends an edit of a published listing to the detail page (UC-007 A2)', async () => {
    server.use(
      http.patch(`${BACKEND_URL}/api/listings/lst_7`, () =>
        envelope(409, 'LISTING_STATE_CONFLICT', 'Only a draft listing can be edited.')
      )
    );

    const location = await expectRedirect(() => updateListingAction('lst_7', REQUEST));

    expect(location).toBe('/seller/listings/lst_7');
  });

  it("sends another organization's listing to the detail route, which renders not-found", async () => {
    server.use(
      http.patch(`${BACKEND_URL}/api/listings/lst_7`, () =>
        envelope(403, 'LISTING_ACCESS_DENIED', 'You cannot manage this listing.')
      )
    );

    const location = await expectRedirect(() => updateListingAction('lst_7', REQUEST));

    expect(location).toBe('/seller/listings/lst_7');
  });
});

describe('publishListingAction', () => {
  it('posts to publish, revalidates, and stays on the page', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_7/publish`, () =>
        HttpResponse.json(activeListing({ id: 'lst_7' }))
      )
    );

    const result = await publishListingAction('lst_7');

    expect(result).toEqual({});
    expect(revalidated.paths).toEqual(
      expect.arrayContaining(['/seller/listings', '/seller/listings/lst_7', '/listings'])
    );
  });

  it('refreshes to the current status when already published (UC-007 A3)', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_7/publish`, () =>
        envelope(409, 'LISTING_STATE_CONFLICT', 'Only a draft listing can be published.')
      )
    );

    const location = await expectRedirect(() => publishListingAction('lst_7'));

    expect(location).toBe('/seller/listings/lst_7');
    expect(revalidated.paths).toContain('/seller/listings/lst_7');
  });

  it("returns the backend's field-level reason as a banner (UC-007 E1)", async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_7/publish`, () =>
        envelope(400, 'INVALID_LISTING_DATA', 'Price must be greater than zero.')
      )
    );

    const result = await publishListingAction('lst_7');

    expect(result.formError).toBe('Price must be greater than zero.');
  });
});

describe('archiveListingAction', () => {
  it('posts to archive, revalidates, and stays on the page', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_7/archive`, () =>
        HttpResponse.json(activeListing({ id: 'lst_7', status: 'archived' }))
      )
    );

    const result = await archiveListingAction('lst_7');

    expect(result).toEqual({});
    expect(revalidated.paths).toContain('/listings');
  });

  it('refreshes to the current status when already archived (UC-008 A2)', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_7/archive`, () =>
        envelope(409, 'LISTING_STATE_CONFLICT', 'Only an active listing can be archived.')
      )
    );

    const location = await expectRedirect(() => archiveListingAction('lst_7'));

    expect(location).toBe('/seller/listings/lst_7');
  });

  it('sends a dead session to sign-in with the detail page as next', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_7/archive`, () =>
        envelope(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.')
      )
    );

    const location = await expectRedirect(() => archiveListingAction('lst_7'));

    expect(location).toBe('/sign-in?next=%2Fseller%2Flistings%2Flst_7');
  });
});
