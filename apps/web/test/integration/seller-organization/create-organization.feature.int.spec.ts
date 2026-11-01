import type { Organization } from '@acme/api-contracts';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BACKEND_URL } from '../../msw/handlers.ts';
import { server } from '../../msw/server.ts';

/**
 * Integration tests for the create-organization Server Action (UC-003 C1 over the web): the real
 * action, data layer, and contract schemas, the backend simulated at the HTTP boundary. Owns the
 * design contract's error mapping — 409 → redirect to the seller home, 429 and 5xx → banner,
 * success → redirect.
 *
 * `next/headers` and `next/navigation` only exist inside a Next.js request scope, so both are
 * substituted at that boundary, exactly like the auth-actions suite.
 */

const cookieJar = vi.hoisted(() => {
  const store = new Map<string, string>();
  return { store };
});

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

const { createOrganizationAction } =
  await import('../../../src/features/seller-organization/actions.ts');

const CREATED: Organization = {
  id: 'org_new',
  name: 'Nordic Refurb AB',
  description: null,
  status: 'active',
  memberCount: 1,
  createdAt: '2026-11-01T12:00:00.000Z',
  deactivatedAt: null,
};

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

describe('createOrganizationAction', () => {
  it('posts the contract-shaped body with the session token and redirects to the seller home', async () => {
    let received: { body: unknown; authorization: string | null } | undefined;
    server.use(
      http.post(`${BACKEND_URL}/api/organizations`, async ({ request }) => {
        received = {
          body: await request.json(),
          authorization: request.headers.get('authorization'),
        };
        return HttpResponse.json(CREATED, { status: 201 });
      })
    );

    const location = await expectRedirect(() =>
      createOrganizationAction({ name: '  Nordic Refurb AB  ' })
    );

    expect(location).toBe('/seller');
    // The layout (header) renders membership; without this, Next's router cache keeps it stale.
    expect(revalidated.paths).toContain('/');
    // The shared schema trims at the boundary, so the backend sees the canonical value.
    expect(received?.body).toEqual({ name: 'Nordic Refurb AB' });
    expect(received?.authorization).toBe('Bearer opaque-token-123');
  });

  it('returns a field error for an invalid name without calling the backend', async () => {
    let called = false;
    server.use(
      http.post(`${BACKEND_URL}/api/organizations`, () => {
        called = true;
        return HttpResponse.json(CREATED, { status: 201 });
      })
    );

    const result = await createOrganizationAction({ name: '' });

    expect(result.fieldErrors?.name).toBeDefined();
    expect(called).toBe(false);
  });

  it('treats ALREADY_IN_ORGANIZATION as the truth and redirects to the seller home', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/organizations`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'ALREADY_IN_ORGANIZATION',
              message: 'You already belong to an organization.',
            },
          },
          { status: 409 }
        )
      )
    );

    const location = await expectRedirect(() =>
      createOrganizationAction({ name: 'Side Business' })
    );

    expect(location).toBe('/seller');
  });

  it('maps a 429 to the rate-limit banner', async () => {
    server.use(
      http.post(
        `${BACKEND_URL}/api/organizations`,
        () => new HttpResponse('Too Many Requests', { status: 429 })
      )
    );

    const result = await createOrganizationAction({ name: 'Nordic Refurb AB' });

    expect(result.formError).toMatch(/Too many attempts/);
  });

  it('maps a backend failure to the generic banner', async () => {
    server.use(http.post(`${BACKEND_URL}/api/organizations`, () => HttpResponse.error()));

    const result = await createOrganizationAction({ name: 'Nordic Refurb AB' });

    expect(result.formError).toMatch(/Something went wrong/);
  });

  it('sends a dead session back to sign-in with the setup page as next', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/organizations`, () =>
        HttpResponse.json(
          { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } },
          { status: 401 }
        )
      )
    );

    const location = await expectRedirect(() =>
      createOrganizationAction({ name: 'Nordic Refurb AB' })
    );

    expect(location).toBe('/sign-in?next=/seller/setup');
  });
});
