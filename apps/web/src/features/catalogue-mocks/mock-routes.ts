import type { Route } from 'next';

/**
 * The catalogue-search mockups (UC-006), in the order they are meant to be read.
 *
 * These are not competing layout directions like the home-page mockups: they are the three
 * states one page must handle. Listing them in one place keeps the gallery, the in-page
 * switcher, and the design spec from drifting apart.
 */
export type CatalogueMockState = 'results' | 'filtered' | 'empty';

export type CatalogueMockPage = {
  readonly state: CatalogueMockState;
  readonly href: Route;
  readonly name: string;
  /** What this state is demonstrating — the reason it is worth a page of its own. */
  readonly thesis: string;
};

export const catalogueMockPages: readonly CatalogueMockPage[] = [
  {
    state: 'results',
    href: '/mocks/catalog/results',
    name: 'Default results',
    thesis:
      'The catalogue as a buyer first meets it: no refinements, newest first, the filter rail idle beside a full grid. Tests whether a card stays legible at three columns and whether the grid reads as a catalogue rather than a list.',
  },
  {
    state: 'filtered',
    href: '/mocks/catalog/filtered',
    name: 'Filters active',
    thesis:
      'Every filter axis engaged at once — two brands, a memory floor, a condition floor, a price ceiling — with a removable chip per refinement. Tests how much vertical space the chips cost and whether the result count still reads as the answer to a question.',
  },
  {
    state: 'empty',
    href: '/mocks/catalog/empty',
    name: 'Zero results',
    thesis:
      'Refinements that match nothing. The state a thin catalogue produces constantly, and the one most likely to be invented during implementation if it is not designed first (UC-006 A1).',
  },
];
