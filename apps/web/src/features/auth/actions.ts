'use server';

import {
  currentUserSchema,
  type SessionResponse,
  sessionResponseSchema,
  signInRequestSchema,
  signUpRequestSchema,
} from '@acme/api-contracts';
import { redirect } from 'next/navigation';
import type { z } from 'zod';

import { apiCommand, apiRequest } from '../../data/api-client.ts';
import { ApiError } from '../../data/api-error.ts';
import { clearSessionToken, writeSessionToken } from '../../lib/auth/session-cookie.ts';
import type { AuthActionFailure } from './types.ts';

/**
 * The web half of UC-002, as decided in ADR-011 §3: credentials and the `Set-Cookie` both happen
 * server-side, so the opaque token is never serialized into HTML or handed to a Client Component.
 *
 * Inputs are re-parsed with the shared contract schemas even though the forms validate client-side
 * — a Server Action is a public endpoint and the browser is not trusted (REPO_MAP.md §9).
 *
 * On success these functions `redirect()` (which throws) — they only *return* failures.
 */

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const RATE_LIMITED_ERROR = 'Too many attempts. Wait a minute, then try again.';

/**
 * Only same-site paths may be redirect targets after sign-in; anything else — absolute URLs,
 * scheme-relative `//host`, backslash tricks — falls back to home so the sign-in page cannot be
 * used as an open redirector.
 */
const sanitizeNextPath = (next: string | undefined): string =>
  next !== undefined && /^\/(?![/\\])/.test(next) ? next : '/';

/** First message per field, shaped for the forms. The schemas carry the user-facing wording. */
const toFieldErrors = (error: z.ZodError): AuthActionFailure => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && fieldErrors[field] === undefined) {
      fieldErrors[field] = issue.message;
    }
  }
  return { fieldErrors };
};

const startSession = async (credentials: {
  email: string;
  password: string;
}): Promise<SessionResponse> =>
  apiRequest({
    path: '/api/auth/sign-in',
    method: 'POST',
    body: credentials,
    schema: sessionResponseSchema,
    authenticated: false,
  });

export const signInAction = async (input: unknown, next?: string): Promise<AuthActionFailure> => {
  const parsed = signInRequestSchema.safeParse(input);
  if (!parsed.success) {
    return toFieldErrors(parsed.error);
  }

  let session: SessionResponse;
  try {
    session = await startSession(parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) {
      // The backend's one generic message for unknown email and wrong password (UC-002 E2).
      return { formError: error.message };
    }
    if (error instanceof ApiError && error.status === 429) {
      return { formError: RATE_LIMITED_ERROR };
    }
    return { formError: GENERIC_ERROR };
  }

  await writeSessionToken(session.token, new Date(session.expiresAt));
  // `redirect` throws; `return` only satisfies lint's control-flow view of this function.
  return redirect(sanitizeNextPath(next));
};

export const signUpAction = async (input: unknown, next?: string): Promise<AuthActionFailure> => {
  const parsed = signUpRequestSchema.safeParse(input);
  if (!parsed.success) {
    return toFieldErrors(parsed.error);
  }

  try {
    await apiRequest({
      path: '/api/auth/sign-up',
      method: 'POST',
      body: parsed.data,
      schema: currentUserSchema,
      authenticated: false,
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_REGISTERED') {
      // Unlike sign-in, confirming existence is fine here (UC-002 E1): the fix is signing in.
      return {
        fieldErrors: { email: 'That email address is already registered — sign in instead.' },
      };
    }
    if (error instanceof ApiError && error.status === 429) {
      return { formError: RATE_LIMITED_ERROR };
    }
    if (error instanceof ApiError && error.status === 400) {
      // Contract validation already ran client- and server-side, so this is rare; the envelope
      // messages are written to be user-safe.
      return { formError: error.message };
    }
    return { formError: GENERIC_ERROR };
  }

  // Auto sign-in (decided in docs/design/auth-pages.md): the backend's sign-up response carries
  // no session, so a second call chains it. If that call fails — e.g. the two calls straddled the
  // rate limit — the account still exists, so landing on sign-in beats a confusing retry here.
  let session: SessionResponse;
  try {
    session = await startSession({ email: parsed.data.email, password: parsed.data.password });
  } catch {
    redirect('/sign-in');
  }

  await writeSessionToken(session.token, new Date(session.expiresAt));
  return redirect(sanitizeNextPath(next));
};

export const signOutAction = async (): Promise<void> => {
  try {
    // Revoke the backend row *first*; clearing the cookie alone is never logout (ADR-011 §3).
    await apiCommand({ path: '/api/auth/sign-out', method: 'POST' });
  } catch (error) {
    // An already-dead session (expired, revoked elsewhere) has nothing left to revoke. Anything
    // else keeps the cookie so the failure is visible rather than silently leaving a live token.
    if (!(error instanceof ApiError && error.isUnauthenticated)) {
      throw error;
    }
  }

  await clearSessionToken();
  redirect('/');
};
