import type { Route } from 'next';

/**
 * The seller listing management mockups (UC-007 publish, UC-008 archive), in the order they are
 * meant to be read. Design contract: `docs/design/seller-listing-management.md`.
 *
 * Not competing directions: these are the states four routes must handle, staged so the list,
 * the form, the detail page, and the one destructive action can each be judged before any of it
 * is wired to the backend. Listing them in one place keeps the gallery, the in-page switcher, and
 * the design contract from drifting apart.
 */
export type SellerListingsMockState =
  | 'list'
  | 'list-empty'
  | 'form'
  | 'form-errors'
  | 'detail-draft'
  | 'detail-active'
  | 'detail-archived'
  | 'archive-dialog'
  | 'deactivated';

export type SellerListingsMockPage = {
  readonly state: SellerListingsMockState;
  readonly href: Route;
  readonly name: string;
  /** Which real route this state belongs to. */
  readonly route: string;
  /** What this state is demonstrating — the reason it is worth a page of its own. */
  readonly thesis: string;
};

export const sellerListingsMockPages: readonly SellerListingsMockPage[] = [
  {
    state: 'list',
    href: '/mocks/seller-listings/list',
    name: 'Listing list',
    route: '/seller/listings',
    thesis:
      'Every listing of the organization in one table, every status mixed (UC-007 S5). Tests whether draft, active, sold-out active, and archived rows stay distinguishable at a glance without tabs the API cannot serve.',
  },
  {
    state: 'list-empty',
    href: '/mocks/seller-listings/list-empty',
    name: 'No listings yet',
    route: '/seller/listings',
    thesis:
      'A brand-new organization. The empty state must point at the one thing to do next, and must say nothing to a viewer-role member who cannot do it.',
  },
  {
    state: 'form',
    href: '/mocks/seller-listings/form',
    name: 'New listing form',
    route: '/seller/listings/new',
    thesis:
      'Fourteen required fields in four groups. Tests whether the grouping makes the disclosure set feel finite, and whether "every field is required to save" reads as honest rather than hostile (UC-007 Gaps, P1-012).',
  },
  {
    state: 'form-errors',
    href: '/mocks/seller-listings/form-errors',
    name: 'Form with errors',
    route: '/seller/listings/new',
    thesis:
      'After a submit that failed validation (UC-007 E1): field-level reasons only, the typed values preserved, no banner. Includes the paired battery-cycle rule and the SEK price rule the contract adds on top of the API schema.',
  },
  {
    state: 'detail-draft',
    href: '/mocks/seller-listings/detail-draft',
    name: 'Detail · draft',
    route: '/seller/listings/[id]',
    thesis:
      'The seller-facing detail of a draft: "not visible to buyers", Edit and Publish side by side. Tests whether publish feels like the decisive step it is without a confirmation dialog.',
  },
  {
    state: 'detail-active',
    href: '/mocks/seller-listings/detail-active',
    name: 'Detail · active',
    route: '/seller/listings/[id]',
    thesis:
      'A published listing with stock in every state — available, reserved, sold. Edit is gone and the page says why (UC-007 A2); Archive is the only action and is visibly the destructive one.',
  },
  {
    state: 'detail-archived',
    href: '/mocks/seller-listings/detail-archived',
    name: 'Detail · archived',
    route: '/seller/listings/[id]',
    thesis:
      'Withdrawn from sale (UC-008 W4): final stock counts, no actions at all, and the one sentence that explains there is no way back.',
  },
  {
    state: 'archive-dialog',
    href: '/mocks/seller-listings/archive-dialog',
    name: 'Archive confirmation',
    route: '/seller/listings/[id]',
    thesis:
      'The AlertDialog (UC-008 W2): the four consequences stated plainly, Cancel focused first, the destructive button last. Decided 2026-11-01 over a confirm page and an inline two-step button.',
  },
  {
    state: 'deactivated',
    href: '/mocks/seller-listings/deactivated',
    name: 'Deactivated organization',
    route: '/seller/listings',
    thesis:
      'The same list for a member whose organization marketplace staff deactivated (UC-003 E6, UC-007 E3): the banner, reads intact, and every write affordance absent rather than disabled. A viewer-role member sees this page minus the banner.',
  },
];
