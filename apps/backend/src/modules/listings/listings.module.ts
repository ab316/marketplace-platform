import type { Clock, IdGenerator } from '@acme/core-contracts';
import type { Kysely } from 'kysely';

import type { Database } from '../../shared/infrastructure/database/schema.ts';
import { ArchiveListing } from './application/commands/archive-listing.ts';
import { CreateListingDraft } from './application/commands/create-listing-draft.ts';
import { PublishListing } from './application/commands/publish-listing.ts';
import { ReleaseListingUnit } from './application/commands/release-listing-unit.ts';
import { ReserveListingUnit } from './application/commands/reserve-listing-unit.ts';
import { UpdateListingDraft } from './application/commands/update-listing-draft.ts';
import type { ListingRepository, OrganizationDirectory } from './application/ports.ts';
import { BrowseActiveListings } from './application/queries/browse-active-listings.ts';
import { GetListingDetail } from './application/queries/get-listing-detail.ts';
import { ListOrganizationListings } from './application/queries/list-organization-listings.ts';
import { InMemoryListingRepository } from './infrastructure/persistence/in-memory-listing-repository.ts';
import { PgListingRepository } from './infrastructure/persistence/pg-listing-repository.ts';
import type { ListingsModuleApi } from './listings.api.ts';

export interface ListingsModuleDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** Omitted in `memory` persistence mode. */
  readonly db?: Kysely<Database> | undefined;
  /** Adapted over the identity module's public API in `src/bootstrap/`. */
  readonly organizations: OrganizationDirectory;
}

/** Composition root for the listings module (ADR-007): the only place its infrastructure is built. */
export const createListingsModule = (deps: ListingsModuleDependencies): ListingsModuleApi => {
  const listings: ListingRepository =
    deps.db === undefined ? new InMemoryListingRepository() : new PgListingRepository(deps.db);

  return {
    createListingDraft: new CreateListingDraft(listings, deps.clock, deps.ids),
    updateListingDraft: new UpdateListingDraft(listings, deps.clock),
    publishListing: new PublishListing(listings, deps.clock),
    archiveListing: new ArchiveListing(listings, deps.clock),
    reserveListingUnit: new ReserveListingUnit(listings, deps.organizations, deps.clock),
    releaseListingUnit: new ReleaseListingUnit(listings, deps.clock),
    browseActiveListings: new BrowseActiveListings(listings, deps.organizations),
    getListingDetail: new GetListingDetail(listings, deps.organizations),
    listOrganizationListings: new ListOrganizationListings(listings),
  };
};
