import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './msw/server.ts';

/**
 * Shared setup for the frontend suites.
 *
 * MSW intercepts at the HTTP boundary, so integration tests exercise the real data layer and the
 * real `@acme/api-contracts` schemas. Erroring on unhandled frames is deliberate: a request no
 * handler describes is almost always a test asserting against an accident.
 */
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
