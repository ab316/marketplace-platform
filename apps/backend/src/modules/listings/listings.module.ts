import type { Clock, IdGenerator } from '@acme/core-contracts';
import type { Kysely } from 'kysely';

import type { Database } from '../../shared/infrastructure/database.ts';
import { createListingsService, type ListingsService } from './application/listings-service.ts';
import { createKyselyListingRepository } from './infrastructure/kysely-listing-repository.ts';

export type ListingsModuleDeps = {
  db: Kysely<Database>;
  clock: Clock;
  idGenerator: IdGenerator;
};

// Composition root for the listings module (ADR-007). The returned service is
// the module's public API; only this file instantiates its infrastructure.
export function createListingsModule(deps: ListingsModuleDeps): ListingsService {
  return createListingsService({
    listingRepository: createKyselyListingRepository(deps.db),
    clock: deps.clock,
    idGenerator: deps.idGenerator,
  });
}

export type ListingsModule = ListingsService;
