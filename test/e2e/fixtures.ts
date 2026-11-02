import { test as base } from '@playwright/test';

/**
 * Suite-wide options, set once in `test/playwright.config.ts` (the one place that may read the
 * environment) and consumed by specs as fixtures. Keeps `process.env` out of the specs themselves.
 */
export type E2EOptions = {
  /** Base URL of the backend the web app under test talks to; specs seed data through it. */
  readonly apiUrl: string;
};

export const test = base.extend<object, E2EOptions>({
  apiUrl: ['http://localhost:4000', { option: true, scope: 'worker' }],
});

export { expect } from '@playwright/test';
