'use server';

import {
  createListingRequestSchema,
  listingDraftSchema,
  listingIdParamsSchema,
  listingIssueSchema,
  listingSchema,
  updateListingRequestSchema,
} from '@acme/api-contracts';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { apiRequest } from '../../data/api-client.ts';
import { ApiError } from '../../data/api-error.ts';
import { formPathFor } from './schemas/listing-form.schema.ts';
import type {
  ArchiveFailure,
  ListingNotice,
  PublishFailure,
  SaveFailure,
  SaveResult,
} from './types.ts';

/**
 * The web half of UC-005, UC-007, UC-008, and UC-009 (design:
 * `docs/design/seller-listing-management.md`).
 *
 * Every action re-parses its input with the shared contract schema: a Server Action is a public
 * endpoint and the browser is not trusted (REPO_MAP.md §9). The backend still authorizes every
 * call; nothing here decides who may do what. Successes and state conflicts `redirect()` (which
 * throws); other failures are returned.
 */

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const RATE_LIMITED_ERROR = 'Too many attempts. Wait a minute, then try again.';
const SIMULTANEOUS_SAVE_ERROR =
  'Someone saved this draft at the same moment. Save again to keep your changes.';

const LIST_PATH = '/seller/listings';
const listingPath = (listingId: string): Route =>
  `/seller/listings/${encodeURIComponent(listingId)}` as Route;
const withNotice = (listingId: string, notice: ListingNotice): Route =>
  `${listingPath(listingId)}?notice=${notice}` as Route;

const issuesSchema = z.object({ issues: z.array(listingIssueSchema) });

/** First message per form field, from a contract parse or a backend issue list. */
const toFieldErrors = (
  issues: readonly { readonly path: string; readonly message: string }[]
): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const path = formPathFor(issue.path);
    fieldErrors[path] ??= issue.message;
  }
  return fieldErrors;
};

const zodIssues = (error: z.ZodError) =>
  error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message }));

const backendIssues = (error: ApiError) => {
  const parsed = issuesSchema.safeParse(error.details);
  return parsed.success ? parsed.data.issues : [];
};

/** Shared mapping for create and save failures (design: User states, draft editor). */
const toSaveFailure = (error: unknown, signInNext: string): SaveFailure => {
  if (!(error instanceof ApiError)) {
    return { formError: GENERIC_ERROR };
  }
  if (error.isUnauthenticated) {
    redirect(`/sign-in?next=${encodeURIComponent(signInNext)}` as Route);
  }
  if (error.status === 400) {
    const issues = backendIssues(error);
    return issues.length > 0
      ? { fieldErrors: toFieldErrors(issues) }
      : { formError: error.message };
  }
  if (error.code === 'LISTING_STATE_CONFLICT') {
    return { blocked: 'published' };
  }
  if (error.code === 'LISTING_CONCURRENCY_CONFLICT') {
    return { formError: SIMULTANEOUS_SAVE_ERROR };
  }
  if (error.isForbidden || error.code === 'ORGANIZATION_STATE_CONFLICT') {
    return { blocked: 'forbidden' };
  }
  if (error.status === 429) {
    return { formError: RATE_LIMITED_ERROR };
  }
  return { formError: GENERIC_ERROR };
};

const parseListingId = (listingId: unknown): string | null => {
  const parsed = listingIdParamsSchema.safeParse({ listingId });
  return parsed.success ? parsed.data.listingId : null;
};

/** UC-005: the first save of a new listing creates the draft, then opens it at its own URL. */
export const createListingDraftAction = async (input: unknown): Promise<SaveFailure> => {
  const parsed = createListingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(zodIssues(parsed.error)) };
  }

  let listingId: string;
  try {
    const draft = await apiRequest({
      path: '/api/listings',
      method: 'POST',
      body: parsed.data,
      schema: listingDraftSchema,
    });
    listingId = draft.id;
  } catch (error) {
    return toSaveFailure(error, `${LIST_PATH}/new`);
  }

  revalidatePath(LIST_PATH);
  return redirect(withNotice(listingId, 'created'));
};

/** UC-007: saves the whole form (empty fields as `null`) and returns the fresh draft. */
export const saveListingDraftAction = async (
  listingId: string,
  input: unknown
): Promise<SaveResult> => {
  const id = parseListingId(listingId);
  const parsed = updateListingRequestSchema.safeParse(input);
  if (id === null) {
    return { ok: false, formError: GENERIC_ERROR };
  }
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(zodIssues(parsed.error)) };
  }

  try {
    const draft = await apiRequest({
      path: `/api/listings/${encodeURIComponent(id)}`,
      method: 'PATCH',
      body: parsed.data,
      schema: listingDraftSchema,
    });
    revalidatePath(LIST_PATH);
    return { ok: true, draft };
  } catch (error) {
    return { ok: false, ...toSaveFailure(error, listingPath(id)) };
  }
};

/** UC-008: publishes a saved, ready draft. Success re-renders the same URL as the live listing. */
export const publishListingAction = async (listingId: string): Promise<PublishFailure> => {
  const id = parseListingId(listingId);
  if (id === null) {
    return { formError: GENERIC_ERROR };
  }

  try {
    await apiRequest({
      path: `/api/listings/${encodeURIComponent(id)}/publish`,
      method: 'POST',
      schema: listingSchema,
    });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) {
      redirect(`/sign-in?next=${encodeURIComponent(listingPath(id))}` as Route);
    }
    if (error instanceof ApiError && error.code === 'LISTING_INCOMPLETE') {
      return { issues: backendIssues(error) };
    }
    if (error instanceof ApiError && error.code === 'LISTING_STATE_CONFLICT') {
      redirect(withNotice(id, 'already-published'));
    }
    if (error instanceof ApiError && error.status === 429) {
      return { formError: RATE_LIMITED_ERROR };
    }
    if (error instanceof ApiError && (error.isForbidden || error.status === 409)) {
      return { formError: 'You can no longer publish this listing.' };
    }
    return { formError: GENERIC_ERROR };
  }

  revalidatePath(LIST_PATH);
  revalidatePath(listingPath(id));
  revalidatePath('/listings');
  return redirect(withNotice(id, 'published'));
};

/** UC-009: archives an active listing. Open orders are untouched by the backend. */
export const archiveListingAction = async (listingId: string): Promise<ArchiveFailure> => {
  const id = parseListingId(listingId);
  if (id === null) {
    return { formError: GENERIC_ERROR };
  }

  try {
    await apiRequest({
      path: `/api/listings/${encodeURIComponent(id)}/archive`,
      method: 'POST',
      schema: listingSchema,
    });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) {
      redirect(`/sign-in?next=${encodeURIComponent(listingPath(id))}` as Route);
    }
    if (error instanceof ApiError && error.code === 'LISTING_STATE_CONFLICT') {
      redirect(withNotice(id, 'already-archived'));
    }
    if (error instanceof ApiError && error.status === 429) {
      return { formError: RATE_LIMITED_ERROR };
    }
    if (error instanceof ApiError && (error.isForbidden || error.status === 409)) {
      return { formError: 'You can no longer archive this listing.' };
    }
    return { formError: GENERIC_ERROR };
  }

  revalidatePath(LIST_PATH);
  revalidatePath(listingPath(id));
  revalidatePath('/listings');
  return redirect(withNotice(id, 'archived'));
};
