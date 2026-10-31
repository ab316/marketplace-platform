import type { CurrentUser } from '@acme/api-contracts';
import { HttpResponse, http } from 'msw';

/**
 * Default backend behaviour for frontend integration tests.
 *
 * Responses must satisfy the real `@acme/api-contracts` schemas — the data layer parses them, so
 * a handler that drifts from the contract fails the test, which is the point. Tests override a
 * specific endpoint with `server.use(...)` rather than editing this file.
 */
export const BACKEND_URL = 'http://localhost:4000';

export const anonymousUser = null;

export const buyerUser: CurrentUser = {
  id: 'usr_buyer_1',
  email: 'buyer@example.com',
  displayName: 'Test Buyer',
  isPlatformAdmin: false,
  membership: null,
};

export const handlers = [
  http.get(`${BACKEND_URL}/api/auth/me`, ({ request }) => {
    if (request.headers.get('authorization') === null) {
      return HttpResponse.json(
        { error: { code: 'unauthenticated', message: 'Sign in to continue.' } },
        { status: 401 }
      );
    }

    return HttpResponse.json(buyerUser);
  }),
];
