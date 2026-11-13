'use server';

import { createOrderRequestSchema, orderIdParamsSchema, orderSchema } from '@acme/api-contracts';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiRequest } from '../../data/api-client.ts';
import { ApiError } from '../../data/api-error.ts';

/**
 * The web half of order placement and cancellation (UC-001 B3–B7, UC-013; design:
 * `docs/design/buyer-ordering.md`).
 *
 * Every action re-parses its input with the shared contract schema: a Server Action is a public
 * endpoint and the browser is not trusted (REPO_MAP.md §9). The backend authorizes every call —
 * nothing here decides who may order (P1-021 is its rule). Success `redirect()`s (which throws);
 * failures are returned as typed results the form renders.
 */

const GENERIC_ERROR = 'Something went wrong and no order was placed. Please try again.';
const RATE_LIMITED_ERROR = 'Too many attempts. Wait a minute, then try again.';

export type PlaceOrderFailure =
  /** The listing lost its last unit or stopped being sold while the buyer decided (UC-001 A3/A4). */
  | { readonly kind: 'unavailable' }
  /** The backend refused this buyer: selling-organization member or staff (P1-021). */
  | { readonly kind: 'not-allowed'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

/**
 * UC-001 B3–B4: the buyer confirms, exactly one order is attempted, and on success they land on
 * the fresh order page — the page itself is the confirmation. The submit button disables while
 * this runs; that guard narrows the double-submit window but durable idempotency stays a backend
 * concern (roadmap "Backend reliability").
 */
export const placeOrderAction = async (input: unknown): Promise<PlaceOrderFailure> => {
  const parsed = createOrderRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { kind: 'error', message: GENERIC_ERROR };
  }

  let orderId: string;
  try {
    const order = await apiRequest({
      path: '/api/orders',
      method: 'POST',
      body: parsed.data,
      schema: orderSchema,
    });
    orderId = order.id;
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return { kind: 'error', message: GENERIC_ERROR };
    }
    if (error.isUnauthenticated) {
      // Back to the listing after sign-in; the intent is never replayed (spec D5).
      redirect(
        `/sign-in?next=${encodeURIComponent(`/listings/${parsed.data.listingId}`)}` as Route
      );
    }
    if (error.code === 'LISTING_UNAVAILABLE' || error.isNotFound) {
      return { kind: 'unavailable' };
    }
    if (error.code === 'ORDER_NOT_ALLOWED') {
      return { kind: 'not-allowed', message: error.message };
    }
    if (error.status === 429) {
      return { kind: 'error', message: RATE_LIMITED_ERROR };
    }
    return { kind: 'error', message: GENERIC_ERROR };
  }

  revalidatePath('/orders');
  return redirect(`/orders/${encodeURIComponent(orderId)}` as Route);
};

export interface CancelOrderResult {
  readonly ok: boolean;
  /** Shown inline when cancelling was refused; the page re-renders with the fresh state. */
  readonly message?: string;
}

/**
 * UC-013: ends an unpaid order after the buyer confirms. An order that meanwhile expired is the
 * same end state, so the refreshed page simply shows it (UC-013 A1); a payment in progress keeps
 * the refusal message (UC-013 A2).
 */
export const cancelOrderAction = async (input: unknown): Promise<CancelOrderResult> => {
  const parsed = orderIdParamsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: GENERIC_ERROR };
  }
  const orderId = parsed.data.orderId;

  try {
    await apiRequest({
      path: `/api/orders/${encodeURIComponent(orderId)}/cancel`,
      method: 'POST',
      body: {},
      schema: orderSchema,
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return { ok: false, message: GENERIC_ERROR };
    }
    if (error.isUnauthenticated) {
      redirect(`/sign-in?next=${encodeURIComponent(`/orders/${orderId}`)}` as Route);
    }
    if (error.code === 'ORDER_STATE_CONFLICT') {
      // Already cancelled or expired, or a payment is in progress: show the backend's own reason
      // and refresh so the page states the real current state (UC-013 A1/A2).
      revalidatePath(`/orders/${encodeURIComponent(orderId)}`);
      return { ok: false, message: error.message };
    }
    if (error.status === 429) {
      return { ok: false, message: RATE_LIMITED_ERROR };
    }
    return { ok: false, message: 'Cancelling did not go through. Please try again.' };
  }

  revalidatePath(`/orders/${encodeURIComponent(orderId)}`);
  revalidatePath('/orders');
  return { ok: true };
};
