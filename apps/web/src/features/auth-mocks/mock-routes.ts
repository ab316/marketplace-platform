import type { Route } from 'next';

/**
 * The sign-in/sign-up mockups, in the order they are meant to be compared.
 *
 * One list, used by the auth gallery page and the in-page switcher, mirroring the home-page
 * mockups: adding a direction means touching exactly one file and no navigation goes stale.
 */
export type AuthMockDirection = {
  readonly name: string;
  /** What this direction is arguing for — the reason to pick it over the other. */
  readonly thesis: string;
  /** The closest real-world reference, so the comparison has an anchor outside this repo. */
  readonly reference: string;
  readonly signInHref: Route;
  readonly signUpHref: Route;
};

export const authMockDirections: readonly AuthMockDirection[] = [
  {
    name: 'Focused card',
    thesis:
      'One centered card and nothing else. Assumes signing in is a chore to finish in five seconds, so the page removes everything that is not the form.',
    reference: 'Closest to backmarket.com sign-in',
    signInHref: '/mocks/auth/focused/sign-in',
    signUpHref: '/mocks/auth/focused/sign-up',
  },
  {
    name: 'Split panel',
    thesis:
      'The form beside a panel restating the escrow promise. Assumes the person creating an account is mid-decision about trusting the marketplace, so the page spends half its width re-earning that trust.',
    reference: 'Closest to shopify.com sign-up',
    signInHref: '/mocks/auth/split/sign-in',
    signUpHref: '/mocks/auth/split/sign-up',
  },
];

/**
 * The states board is a different kind of mockup — every error and pending state the forms must
 * handle (UC-002 E1–E3), not a layout direction — so it sits beside `authMockDirections` rather
 * than in it.
 */
export const authStatesMock: {
  readonly href: Route;
  readonly name: string;
  readonly thesis: string;
} = {
  href: '/mocks/auth/states',
  name: 'Form states',
  thesis:
    'Every validation, failure, and pending state from UC-002, rendered side by side so none is invented during implementation.',
};

/** Flat list for the in-page switcher. */
export const authMockPages: readonly { readonly href: Route; readonly name: string }[] = [
  { href: '/mocks/auth/focused/sign-in', name: 'Focused · sign in' },
  { href: '/mocks/auth/focused/sign-up', name: 'Focused · sign up' },
  { href: '/mocks/auth/split/sign-in', name: 'Split · sign in' },
  { href: '/mocks/auth/split/sign-up', name: 'Split · sign up' },
  { href: authStatesMock.href, name: 'States' },
];
