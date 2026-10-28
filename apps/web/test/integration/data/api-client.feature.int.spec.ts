import { currentUserSchema } from '@acme/api-contracts';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BACKEND_URL, buyerUser } from '../../msw/handlers.ts';
import { server } from '../../msw/server.ts';

/**
 * Integration test for the data layer: the real `apiRequest`, the real contract schemas, and the
 * backend simulated at the HTTP boundary. This is not an E2E test (REPO_MAP.md §11).
 *
 * `next/headers` is substituted because it only exists inside a Next.js request scope; the cookie
 * value it returns is the input under test, so the substitution is at the boundary, not around
 * the behaviour.
 */
const sessionToken = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === 'marketplace_session' && sessionToken.value !== undefined
          ? { name, value: sessionToken.value }
          : undefined,
    }),
}));

const { apiCommand, apiRequest } = await import('../../../src/data/api-client.ts');
const { ApiContractError, ApiError } = await import('../../../src/data/api-error.ts');

/** Narrows a caught rejection so its fields can be asserted without a type assertion. */
const asApiError = (error: unknown): InstanceType<typeof ApiError> => {
  if (!(error instanceof ApiError)) {
    throw new Error(`Expected an ApiError, received: ${String(error)}`);
  }
  return error;
};

describe('apiRequest', () => {
  beforeEach(() => {
    sessionToken.value = undefined;
  });

  it('forwards the session cookie as a Bearer header (ADR-011)', async () => {
    sessionToken.value = 'opaque-token-123';
    let seenAuthorization: string | null = null;

    server.use(
      http.get(`${BACKEND_URL}/api/auth/me`, ({ request }) => {
        seenAuthorization = request.headers.get('authorization');
        return HttpResponse.json(buyerUser);
      })
    );

    await apiRequest({ path: '/api/auth/me', schema: currentUserSchema });

    expect(seenAuthorization).toBe('Bearer opaque-token-123');
  });

  it('omits the Authorization header when there is no session', async () => {
    let seenAuthorization: string | null = 'unset';

    server.use(
      http.get(`${BACKEND_URL}/api/listings`, ({ request }) => {
        seenAuthorization = request.headers.get('authorization');
        return HttpResponse.json({ items: [] });
      })
    );

    await apiCommand({ path: '/api/listings' });

    expect(seenAuthorization).toBeNull();
  });

  it('never sends the session when authenticated is false, so public reads stay cacheable', async () => {
    sessionToken.value = 'opaque-token-123';
    let seenAuthorization: string | null = 'unset';

    server.use(
      http.get(`${BACKEND_URL}/api/listings`, ({ request }) => {
        seenAuthorization = request.headers.get('authorization');
        return HttpResponse.json({ items: [] });
      })
    );

    await apiCommand({ path: '/api/listings', authenticated: false });

    expect(seenAuthorization).toBeNull();
  });

  it('sends a correlation id so a UI failure can be traced into backend logs', async () => {
    let seenCorrelationId: string | null = null;

    server.use(
      http.get(`${BACKEND_URL}/api/listings`, ({ request }) => {
        seenCorrelationId = request.headers.get('x-correlation-id');
        return HttpResponse.json({ items: [] });
      })
    );

    await apiCommand({ path: '/api/listings', correlationId: 'corr-abc' });

    expect(seenCorrelationId).toBe('corr-abc');
  });

  it('normalizes the shared error envelope into an ApiError', async () => {
    server.use(
      http.get(`${BACKEND_URL}/api/orders/missing`, () =>
        HttpResponse.json(
          { error: { code: 'order_not_found', message: 'That order does not exist.' } },
          { status: 404 }
        )
      )
    );

    const error = await apiCommand({ path: '/api/orders/missing' }).catch(
      (cause: unknown) => cause
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'order_not_found' });
    expect(asApiError(error).isRetryable).toBe(false);
  });

  it('does not leak an unparseable error body as a success', async () => {
    server.use(
      http.get(
        `${BACKEND_URL}/api/listings`,
        () => new HttpResponse('<html>502</html>', { status: 502 })
      )
    );

    const error = await apiCommand({ path: '/api/listings' }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: 'unknown_error' });
    expect(asApiError(error).isRetryable).toBe(true);
  });

  it('rejects a 2xx body that does not match the contract, instead of passing it to the UI', async () => {
    server.use(
      http.get(`${BACKEND_URL}/api/auth/me`, () =>
        HttpResponse.json({ id: 'usr_1', email: 'buyer@example.com' })
      )
    );

    const error = await apiRequest({ path: '/api/auth/me', schema: currentUserSchema }).catch(
      (cause: unknown) => cause
    );

    expect(error).toBeInstanceOf(ApiContractError);
  });
});
