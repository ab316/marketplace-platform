/**
 * What the create-organization Server Action returns when it does not redirect. Mirrors
 * `AuthActionFailure` in `features/auth`; separate because a `'use server'` module may only
 * export async functions at runtime.
 */
export type CreateOrganizationFailure = {
  /** Error for the banner above the form: rate limiting or an unexpected failure. */
  readonly formError?: string;
  readonly fieldErrors?: {
    readonly name?: string;
    readonly description?: string;
  };
};
