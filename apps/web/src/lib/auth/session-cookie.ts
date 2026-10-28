import 'server-only';
import { cookies } from 'next/headers';

import { isProduction } from '../env.ts';

/**
 * The browser half of the session transport (ADR-011).
 *
 * The opaque token issued by the backend (ADR-008) is carried to the browser in an httpOnly
 * cookie and never in JavaScript-readable storage, so an XSS cannot exfiltrate it. The backend
 * API itself stays header-based; `src/data/api-client.ts` performs the translation.
 *
 * Server Components and Server Actions only. Importing this from a Client Component is a build
 * error via `server-only`, which is the point.
 */
export const SESSION_COOKIE_NAME = 'marketplace_session';

/**
 * `SameSite=Lax` blocks cross-site CSRF on state-changing requests while leaving ordinary inbound
 * navigation working. It is sufficient only while every state change uses POST/PATCH/DELETE; a
 * state-changing GET would reopen the hole (ADR-011).
 */
const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
} as const;

export const readSessionToken = async (): Promise<string | undefined> => {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
};

/**
 * Writes the cookie after the backend has created the session row.
 *
 * `expiresAt` mirrors the session's own expiry so the browser stops sending a token the backend
 * would reject anyway. The cookie expiring is never what ends a session — only the backend row
 * is authoritative.
 */
export const writeSessionToken = async (token: string, expiresAt: Date): Promise<void> => {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    ...baseCookieOptions,
    secure: isProduction(),
    expires: expiresAt,
  });
};

/**
 * Clears the cookie.
 *
 * This is never logout on its own: the caller must first revoke the session through the backend,
 * or the token stays valid for anyone who captured it.
 */
export const clearSessionToken = async (): Promise<void> => {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
};
