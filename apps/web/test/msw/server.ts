import { setupServer } from 'msw/node';

import { handlers } from './handlers.ts';

/** Shared MSW server. Per-test overrides go through `server.use(...)`. */
export const server = setupServer(...handlers);
