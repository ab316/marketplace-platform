import { CATALOGUE_BRANDS } from '@acme/api-contracts';
import { describe, expect, it } from 'vitest';

import { LISTED_BRANDS } from '../../../src/modules/listings/domain/brands.ts';

describe('Curated brand list (P1-017)', () => {
  it('is the same list in the domain and in the shared contract', () => {
    expect(LISTED_BRANDS).toEqual([...CATALOGUE_BRANDS]);
  });
});
