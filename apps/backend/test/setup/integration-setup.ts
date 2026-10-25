import { afterAll } from 'vitest';

import { disposeTestDatabase } from '../helpers/test-database.ts';

// Runs once per integration test file: releases the file's database connections after its tests.
afterAll(async () => {
  await disposeTestDatabase();
});
