import type { Route } from 'next';

/**
 * Every URL the seller listing feature produces, in one place, so a renamed route is one edit
 * and the typed-routes casts for dynamic segments are not scattered through components.
 */

export const SELLER_LISTINGS_PAGE_SIZE = 20;

export const sellerListingsHref = (page = 1): Route =>
  page <= 1 ? '/seller/listings' : (`/seller/listings?page=${page}` as Route);

export const newListingHref = (): Route => '/seller/listings/new';

export const listingDetailHref = (listingId: string): Route =>
  `/seller/listings/${encodeURIComponent(listingId)}` as Route;

export const editListingHref = (listingId: string): Route =>
  `/seller/listings/${encodeURIComponent(listingId)}/edit` as Route;

/**
 * Where "view as a buyer" goes until the buyer listing-detail page exists (the next Phase 6
 * slice): the public catalogue searched for this model. Swap for the detail URL in that slice.
 */
export const publicListingHref = (model: string): Route =>
  `/listings?q=${encodeURIComponent(model)}` as Route;

/** Page number from the list route's `?page=`; anything unusable is page 1. */
export const parseListingsPage = (raw: string | string[] | undefined): number => {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
};
