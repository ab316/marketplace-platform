import 'server-only';
import { type CurrentUser, currentUserSchema } from '@acme/api-contracts';
import { cache } from 'react';

import { apiRequest } from '../api-client.ts';
import { ApiError } from '../api-error.ts';

/**
 * Who the current request is being made by, as the backend sees them.
 *
 * `cache()` deduplicates this within a single render pass, so a layout and three components can
 * each ask without three round-trips. It deliberately does **not** cache across requests: role,
 * membership, and session validity are resolved per request by design (ADR-008 §3), which is
 * what makes revocation and role changes take effect immediately (ADR-011 §5).
 *
 * Returns `null` for anonymous or no-longer-valid sessions rather than throwing, because "signed
 * out" is an ordinary state for a page to render, not an error.
 */
export const getCurrentActor = cache(async (): Promise<CurrentUser | null> => {
  try {
    return await apiRequest({
      path: '/api/auth/me',
      schema: currentUserSchema,
    });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) {
      return null;
    }
    throw error;
  }
});

/**
 * UX-level guard for pages that require a signed-in user.
 *
 * This is not security. The backend re-validates the session and re-checks role, membership, and
 * ownership on every request (ADR-011 §4); this only avoids rendering a page the user cannot use.
 */
export const requireActor = async (): Promise<CurrentUser> => {
  const actor = await getCurrentActor();
  if (actor === null) {
    throw new ApiError(401, 'unauthenticated', 'Sign in to continue.');
  }
  return actor;
};
