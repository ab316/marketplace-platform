'use server';

import { createOrganizationRequestSchema, organizationSchema } from '@acme/api-contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { z } from 'zod';

import { apiRequest } from '../../data/api-client.ts';
import { ApiError } from '../../data/api-error.ts';
import type { CreateOrganizationFailure } from './types.ts';

/**
 * The web half of UC-003 C1–C3 (design: `docs/design/seller-organization-setup.md`).
 *
 * Input is re-parsed with the shared contract schema even though the form validates client-side —
 * a Server Action is a public endpoint and the browser is not trusted (REPO_MAP.md §9). On
 * success this `redirect()`s (which throws) — it only *returns* failures.
 */

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const RATE_LIMITED_ERROR = 'Too many attempts. Wait a minute, then try again.';

/** First message per field, shaped for the form. The schema carries the user-facing wording. */
const toFieldErrors = (error: z.ZodError): CreateOrganizationFailure => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && fieldErrors[field] === undefined) {
      fieldErrors[field] = issue.message;
    }
  }
  return { fieldErrors };
};

export const createOrganizationAction = async (
  input: unknown
): Promise<CreateOrganizationFailure> => {
  const parsed = createOrganizationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return toFieldErrors(parsed.error);
  }

  try {
    await apiRequest({
      path: '/api/organizations',
      method: 'POST',
      body: parsed.data,
      schema: organizationSchema,
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'ALREADY_IN_ORGANIZATION') {
      // Created moments ago in another tab, or this page's check was stale. The truth is
      // "you have an organization", not an error (design: Conflict state).
      redirect('/seller');
    }
    if (error instanceof ApiError && error.isUnauthenticated) {
      redirect('/sign-in?next=/seller/setup');
    }
    if (error instanceof ApiError && error.status === 429) {
      return { formError: RATE_LIMITED_ERROR };
    }
    if (error instanceof ApiError && error.status === 400) {
      // Contract validation already ran on both sides, so this is rare; envelope messages are
      // written to be user-safe.
      return { formError: error.message };
    }
    return { formError: GENERIC_ERROR };
  }

  // Membership changed, and the header renders it on every page. The backend re-reads it per
  // request (ADR-011 §5), but Next's client router cache would keep serving the stale layout —
  // unlike the auth actions, nothing here touches cookies, which is what usually busts it.
  revalidatePath('/', 'layout');
  return redirect('/seller');
};
