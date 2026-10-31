import type { Route } from 'next';

/**
 * The home-page mockups, in the order they are meant to be compared.
 *
 * One list, used by the gallery page, the in-page switcher, and the site header, so adding a
 * fourth direction means touching exactly one file and no navigation goes stale.
 */
export type MockRoute = {
  readonly href: Route;
  readonly name: string;
  /** What this direction is arguing for — the reason to pick it over the others. */
  readonly thesis: string;
  /** The closest real-world reference, so the comparison has an anchor outside this repo. */
  readonly reference: string;
};

export const mockRoutes: readonly MockRoute[] = [
  {
    href: '/mocks/marketplace',
    name: 'Commerce-first',
    thesis:
      'Deals above the fold, a search bar that dominates the header, and dense product grids. Assumes the visitor already wants to buy and is price-shopping.',
    reference: 'Closest to backmarket.com',
  },
  {
    href: '/mocks/editorial',
    name: 'Sustainability-led',
    thesis:
      'Leads with impact numbers and a calm explanation of how refurbished works, then sells. Assumes the visitor needs convincing that used is not risky.',
    reference: 'Closest to refurbed.se',
  },
  {
    href: '/mocks/original',
    name: 'Original scaffold',
    thesis:
      'The page the Next.js foundation shipped with. Kept as a reference point for the design tokens and the trust-first copy direction.',
    reference: 'This repo, before today',
  },
];

/**
 * The brand board is a different kind of mockup — logo directions, not page directions — so it
 * sits beside `mockRoutes` rather than in it and stays out of the home-page switcher.
 */
export const brandMock: MockRoute = {
  href: '/mocks/brand',
  name: 'Brand and logo',
  thesis:
    'Four marks for "Acme Tech", each shown large, in the header, in dark mode, and at favicon size — the sizes where the current logo disappears.',
  reference: 'Replaces the scaffold "M" tile',
};
