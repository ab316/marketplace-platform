import type { SessionResponse } from '@acme/api-contracts';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

import { BACKEND_URL, buyerUser } from '../../msw/handlers.ts';
import { server } from '../../msw/server.ts';

/**
 * Integration tests for the auth Server Actions: the real actions, the real data layer and
 * contract schemas, the backend simulated at the HTTP boundary (REPO_MAP.md §11). These own the
 * ADR-011 behavior — cookie written from the session response, revoke-before-clear on sign-out,
 * the open-redirect guard — and the UC-002 error mapping.
 *
 * `next/headers` and `next/navigation` only exist inside a Next.js request scope, so both are
 * substituted at that boundary: an in-memory cookie jar, and a `redirect` that throws a sentinel
 * exactly like the real one does.
 */

type CookieWrite = { readonly value: string; readonly expires?: Date | undefined };

const cookieJar = vi.hoisted(() => {
  const writes: { name: string; action: 'set' | 'delete'; write?: CookieWrite }[] = [];
  const store = new Map<string, CookieWrite>();
  return {
    writes,
    store,
    reset: () => {
      writes.length = 0;
      store.clear();
    },
  };
});

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const entry = cookieJar.store.get(name);
        return entry === undefined ? undefined : { name, value: entry.value };
      },
      set: (name: string, value: string, options?: { expires?: Date }) => {
        cookieJar.store.set(name, { value, expires: options?.expires });
        cookieJar.writes.push({ name, action: 'set', write: { value, expires: options?.expires } });
      },
      delete: (name: string) => {
        cookieJar.store.delete(name);
        cookieJar.writes.push({ name, action: 'delete' });
      },
    }),
}));

const redirected = vi.hoisted(() => ({ location: undefined as string | undefined }));

vi.mock('next/navigation', () => ({
  redirect: (location: string): never => {
    redirected.location = location;
    throw new Error(`NEXT_REDIRECT:${location}`);
  },
}));

const { signInAction, signOutAction, signUpAction } =
  await import('../../../src/features/auth/actions.ts');

const SESSION: SessionResponse = {
  token: 'opaque-token-123',
  expiresAt: '2026-11-30T12:00:00.000Z',
  user: buyerUser,
};

const CREDENTIALS = { email: 'kim@example.com', password: 'a-long-password' };
const SIGN_UP_INPUT = { ...CREDENTIALS, displayName: 'Kim Larsson' };

const invalidCredentialsResponse = () =>
  HttpResponse.json(
    { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } },
    { status: 401 }
  );

/** Runs an action expected to redirect, returning the location it redirected to. */
const expectRedirect = async (run: () => Promise<unknown>): Promise<string | undefined> => {
  redirected.location = undefined;
  await expect(run()).rejects.toThrow(/NEXT_REDIRECT/);
  return redirected.location;
};

beforeEach(() => {
  cookieJar.reset();
  redirected.location = undefined;
});

describe('signInAction', () => {
  it('writes the httpOnly session cookie from the backend session and redirects home', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/auth/sign-in`, () =>
        HttpResponse.json(SESSION, { status: 200 })
      )
    );

    const location = await expectRedirect(() => signInAction(CREDENTIALS));

    expect(location).toBe('/');
    expect(cookieJar.store.get('marketplace_session')).toMatchObject({
      value: 'opaque-token-123',
      expires: new Date(SESSION.expiresAt),
    });
  });

  it('returns the generic failure for invalid credentials and sets no cookie (UC-002 E2)', async () => {
    server.use(http.post(`${BACKEND_URL}/api/auth/sign-in`, invalidCredentialsResponse));

    const result = await signInAction(CREDENTIALS);

    expect(result).toEqual({ formError: 'Invalid email or password.' });
    expect(cookieJar.store.size).toBe(0);
  });

  it('maps a 429 to a distinct rate-limit message (UC-002 E3)', async () => {
    server.use(
      // @fastify/rate-limit answers with its own body, not our envelope — the status is the signal.
      http.post(
        `${BACKEND_URL}/api/auth/sign-in`,
        () => new HttpResponse('Too Many Requests', { status: 429 })
      )
    );

    const result = await signInAction(CREDENTIALS);

    expect(result.formError).toMatch(/Too many attempts/);
  });

  it('honors a same-site next path', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/auth/sign-in`, () =>
        HttpResponse.json(SESSION, { status: 200 })
      )
    );

    const location = await expectRedirect(() => signInAction(CREDENTIALS, '/orders/123'));

    expect(location).toBe('/orders/123');
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example'])(
    'refuses %s as a redirect target, so sign-in is not an open redirector',
    async (next) => {
      server.use(
        http.post(`${BACKEND_URL}/api/auth/sign-in`, () =>
          HttpResponse.json(SESSION, { status: 200 })
        )
      );

      const location = await expectRedirect(() => signInAction(CREDENTIALS, next));

      expect(location).toBe('/');
    }
  );

  it('re-validates input server-side, because a Server Action is a public endpoint', async () => {
    const result = await signInAction({ email: 'not-an-email', password: '' });

    expect(result.fieldErrors).toBeDefined();
    expect(cookieJar.store.size).toBe(0);
  });
});

describe('signUpAction', () => {
  it('creates the account, chains the sign-in, writes the cookie, and redirects (auto sign-in)', async () => {
    let signInBody: unknown;
    server.use(
      http.post(`${BACKEND_URL}/api/auth/sign-up`, () =>
        HttpResponse.json(buyerUser, { status: 201 })
      ),
      http.post(`${BACKEND_URL}/api/auth/sign-in`, async ({ request }) => {
        signInBody = await request.json();
        return HttpResponse.json(SESSION, { status: 200 });
      })
    );

    const location = await expectRedirect(() => signUpAction(SIGN_UP_INPUT));

    expect(location).toBe('/');
    // The chained sign-in used the same credentials the user just registered with.
    expect(signInBody).toEqual(CREDENTIALS);
    expect(cookieJar.store.get('marketplace_session')?.value).toBe('opaque-token-123');
  });

  it('puts an already-registered email on the email field and never reaches sign-in (UC-002 E1)', async () => {
    let signInCalled = false;
    server.use(
      http.post(`${BACKEND_URL}/api/auth/sign-up`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'EMAIL_ALREADY_REGISTERED',
              message: 'That email address is already registered.',
            },
          },
          { status: 400 }
        )
      ),
      http.post(`${BACKEND_URL}/api/auth/sign-in`, () => {
        signInCalled = true;
        return HttpResponse.json(SESSION, { status: 200 });
      })
    );

    const result = await signUpAction(SIGN_UP_INPUT);

    expect(result.fieldErrors?.email).toMatch(/already registered/);
    expect(signInCalled).toBe(false);
    expect(cookieJar.store.size).toBe(0);
  });

  it('lands on sign-in when the account was created but the chained sign-in failed', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/auth/sign-up`, () =>
        HttpResponse.json(buyerUser, { status: 201 })
      ),
      // E.g. the two calls straddled the credential rate limit.
      http.post(
        `${BACKEND_URL}/api/auth/sign-in`,
        () => new HttpResponse('Too Many Requests', { status: 429 })
      )
    );

    const location = await expectRedirect(() => signUpAction(SIGN_UP_INPUT));

    expect(location).toBe('/sign-in');
    expect(cookieJar.store.size).toBe(0);
  });
});

describe('signOutAction', () => {
  it('revokes the backend session before clearing the cookie (ADR-011 §3)', async () => {
    cookieJar.store.set('marketplace_session', { value: 'opaque-token-123' });
    let revokedToken: string | null = null;

    server.use(
      http.post(`${BACKEND_URL}/api/auth/sign-out`, ({ request }) => {
        revokedToken = request.headers.get('authorization');
        return new HttpResponse(null, { status: 204 });
      })
    );

    const location = await expectRedirect(() => signOutAction());

    expect(location).toBe('/');
    // The revoke call carried the token — proof the cookie was still present when it ran. A
    // clear-first implementation would have sent no Authorization header at all.
    expect(revokedToken).toBe('Bearer opaque-token-123');
    expect(cookieJar.store.size).toBe(0);
    expect(cookieJar.writes).toContainEqual(expect.objectContaining({ action: 'delete' }));
  });

  it('still clears the cookie when the session is already dead', async () => {
    cookieJar.store.set('marketplace_session', { value: 'expired-token' });
    server.use(
      http.post(`${BACKEND_URL}/api/auth/sign-out`, () =>
        HttpResponse.json(
          { error: { code: 'unauthenticated', message: 'Sign in to continue.' } },
          { status: 401 }
        )
      )
    );

    const location = await expectRedirect(() => signOutAction());

    expect(location).toBe('/');
    expect(cookieJar.store.size).toBe(0);
  });

  it('keeps the cookie when revocation fails, so a live token is never silently abandoned', async () => {
    cookieJar.store.set('marketplace_session', { value: 'opaque-token-123' });
    server.use(
      http.post(`${BACKEND_URL}/api/auth/sign-out`, () => new HttpResponse(null, { status: 500 }))
    );

    await expect(signOutAction()).rejects.toThrow('Something went wrong. Please try again.');

    expect(cookieJar.store.get('marketplace_session')?.value).toBe('opaque-token-123');
  });
});
