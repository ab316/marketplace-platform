/**
 * What a seller-listing Server Action returns when it does not redirect. Mirrors
 * `CreateOrganizationFailure`; separate because a `'use server'` module may only export async
 * functions at runtime. An empty object means success for the actions that stay on the page.
 */
export type ListingActionFailure = {
  /** Error for the banner: rate limiting, a deactivated organization, an unexpected failure. */
  readonly formError?: string;
};
