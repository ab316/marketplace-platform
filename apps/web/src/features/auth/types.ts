/**
 * What an auth Server Action returns when it does not redirect. Lives apart from `actions.ts`
 * because a `'use server'` module may only export async functions at runtime.
 */
export type AuthActionFailure = {
  /**
   * Error for the banner above the form: invalid credentials, rate limiting, or an unexpected
   * failure. Never names a specific field — sign-in failures are deliberately generic (UC-002 E2).
   */
  readonly formError?: string;
  /** Errors for individual fields, e.g. "email already registered" on sign-up (UC-002 E1). */
  readonly fieldErrors?: {
    readonly displayName?: string;
    readonly email?: string;
    readonly password?: string;
  };
};
