'use server';

import {
  createListingRequestSchema,
  listingSchema,
  updateListingRequestSchema,
} from '@acme/api-contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiRequest } from '../../data/api-client.ts';
import { ApiError } from '../../data/api-error.ts';
import { listingDetailHref, sellerListingsHref } from './paths.ts';
import type { ListingActionFailure } from './types.ts';

/**
 * The web half of UC-007 (create, edit, publish) and UC-008 (archive); design contract
 * `docs/design/seller-listing-management.md`.
 *
 * Inputs are re-parsed with the shared contract schemas even though the form validates
 * client-side — a Server Action is a public endpoint and the browser is not trusted
 * (REPO_MAP.md §9). Create and edit `redirect()` on success (which throws); publish and archive
 * stay on the detail page and return `{}`, relying on `revalidatePath` to re-render it with the
 * new status. Only failures are *returned*.
 *
 * Error mapping (contract, "User states"):
 * - 401 → sign-in with `next`;
 * - 403/404 → the listing's detail route, whose shell renders not-found (create: the list);
 * - 409 `LISTING_STATE_CONFLICT` → the detail page, which shows the real status (UC-007 A2/A3,
 *   UC-008 A2);
 * - 409 `ORGANIZATION_STATE_CONFLICT` and 400 → banner with the backend's user-safe message;
 * - 429 → the rate-limit banner; anything else → the generic banner.
 */

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const RATE_LIMITED_ERROR = 'Too many attempts. Wait a minute, then try again.';
const INVALID_INPUT_ERROR = 'Some fields are not valid. Check the form and try again.';

/** Shared failure mapping; `fallbackPath` is where 403/404 and state conflicts land. */
const toFailure = (
  error: unknown,
  { nextPath, fallbackPath }: { nextPath: string; fallbackPath: string }
): ListingActionFailure => {
  if (!(error instanceof ApiError)) {
    return { formError: GENERIC_ERROR };
  }
  if (error.isUnauthenticated) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }
  if (error.isForbidden || error.isNotFound) {
    redirect(fallbackPath);
  }
  if (error.code === 'LISTING_STATE_CONFLICT') {
    // Published or archived from another tab: the truth is the listing's current status, so
    // show it rather than an error (design contract, 409 handling).
    revalidatePath(fallbackPath);
    redirect(fallbackPath);
  }
  if (error.status === 429) {
    return { formError: RATE_LIMITED_ERROR };
  }
  if (error.status === 400 || error.status === 409) {
    // Envelope messages are written to be user-safe; the 409 here is the deactivated
    // organization (UC-007 E3, UC-008 E2) or a validation reason the form did not catch.
    return { formError: error.message };
  }
  return { formError: GENERIC_ERROR };
};

/** The paths whose cached render a listing change invalidates. */
const revalidateListing = (listingId: string): void => {
  revalidatePath(sellerListingsHref());
  revalidatePath(listingDetailHref(listingId));
  // Publication and archiving change what buyers can find (UC-007 S4, UC-008 W4).
  revalidatePath('/listings');
};

export const createListingAction = async (input: unknown): Promise<ListingActionFailure> => {
  const parsed = createListingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { formError: INVALID_INPUT_ERROR };
  }

  let listingId: string;
  try {
    const created = await apiRequest({
      path: '/api/listings',
      method: 'POST',
      body: parsed.data,
      schema: listingSchema,
    });
    listingId = created.id;
  } catch (error) {
    return toFailure(error, {
      nextPath: '/seller/listings/new',
      fallbackPath: sellerListingsHref(),
    });
  }

  revalidatePath(sellerListingsHref());
  return redirect(listingDetailHref(listingId));
};

export const updateListingAction = async (
  listingId: string,
  input: unknown
): Promise<ListingActionFailure> => {
  const parsed = updateListingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { formError: INVALID_INPUT_ERROR };
  }

  const detail = listingDetailHref(listingId);
  try {
    await apiRequest({
      path: `/api/listings/${encodeURIComponent(listingId)}`,
      method: 'PATCH',
      body: parsed.data,
      schema: listingSchema,
    });
  } catch (error) {
    return toFailure(error, { nextPath: `${detail}/edit`, fallbackPath: detail });
  }

  revalidateListing(listingId);
  return redirect(detail);
};

export const publishListingAction = async (listingId: string): Promise<ListingActionFailure> => {
  const detail = listingDetailHref(listingId);
  try {
    await apiRequest({
      path: `/api/listings/${encodeURIComponent(listingId)}/publish`,
      method: 'POST',
      schema: listingSchema,
    });
  } catch (error) {
    return toFailure(error, { nextPath: detail, fallbackPath: detail });
  }

  revalidateListing(listingId);
  return {};
};

export const archiveListingAction = async (listingId: string): Promise<ListingActionFailure> => {
  const detail = listingDetailHref(listingId);
  try {
    await apiRequest({
      path: `/api/listings/${encodeURIComponent(listingId)}/archive`,
      method: 'POST',
      schema: listingSchema,
    });
  } catch (error) {
    return toFailure(error, { nextPath: detail, fallbackPath: detail });
  }

  revalidateListing(listingId);
  return {};
};
