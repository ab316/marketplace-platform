import type { ListingDraft, ListingIssue } from '@acme/api-contracts';

/**
 * Results of the seller-listing Server Actions. Separate from `actions.ts` because a
 * `'use server'` module may only export async functions at runtime.
 */

/** Why a save was refused, shaped for the editor. */
export interface SaveFailure {
  /** Banner above the form: rate limiting, a simultaneous save, or an unexpected failure. */
  readonly formError?: string;
  /** Messages keyed by form path (`priceKronor`, `specifications.brand`, …). */
  readonly fieldErrors?: Readonly<Record<string, string>>;
  /**
   * The listing can no longer be edited here: another member published it, or the actor lost
   * write access. The editor offers a reload into the page's real state.
   */
  readonly blocked?: 'published' | 'forbidden';
}

export type SaveResult =
  | { readonly ok: true; readonly draft: ListingDraft }
  | ({ readonly ok: false } & SaveFailure);

/** Publishing refused for a reason the editor can show. Success and state conflicts redirect. */
export interface PublishFailure {
  readonly formError?: string;
  /** `LISTING_INCOMPLETE`: the server's issues replace the readiness panel. */
  readonly issues?: readonly ListingIssue[];
}

/** Archiving refused for a reason the page can show. Success and state conflicts redirect. */
export interface ArchiveFailure {
  readonly formError: string;
}

/** One-off banners after a redirect, carried in `?notice=`. */
export const LISTING_NOTICES = {
  created: { tone: 'success', text: 'Draft saved. You can come back to it any time.' },
  published: {
    tone: 'success',
    text: 'Your listing is live. Buyers can find it in the catalogue.',
  },
  archived: {
    tone: 'success',
    text: 'Listing archived. It no longer takes orders; open orders continue.',
  },
  'already-published': { tone: 'info', text: 'This listing was already published.' },
  'already-archived': { tone: 'info', text: 'This listing was already archived.' },
} as const;

export type ListingNotice = keyof typeof LISTING_NOTICES;

export const isListingNotice = (value: unknown): value is ListingNotice =>
  typeof value === 'string' && Object.hasOwn(LISTING_NOTICES, value);
