import type { ArchiveListing } from './application/commands/archive-listing.ts';
import type { CreateListingDraft } from './application/commands/create-listing-draft.ts';
import type { MarkReservedUnitSold } from './application/commands/mark-reserved-unit-sold.ts';
import type { PublishListing } from './application/commands/publish-listing.ts';
import type { ReleaseListingUnit } from './application/commands/release-listing-unit.ts';
import type { ReserveListingUnit } from './application/commands/reserve-listing-unit.ts';
import type { UpdateListingDraft } from './application/commands/update-listing-draft.ts';
import type { BrowseActiveListings } from './application/queries/browse-active-listings.ts';
import type { GetListingDetail } from './application/queries/get-listing-detail.ts';
import type { ListOrganizationListings } from './application/queries/list-organization-listings.ts';

/**
 * Everything other modules and the HTTP layer may use from this module. Declared separately from
 * the composition root so consumers depend on the public surface, not on how it is built.
 */
export interface ListingsModuleApi {
  readonly createListingDraft: CreateListingDraft;
  readonly updateListingDraft: UpdateListingDraft;
  readonly publishListing: PublishListing;
  readonly archiveListing: ArchiveListing;
  /** Called by the orders module when an order claims a unit. */
  readonly reserveListingUnit: ReserveListingUnit;
  /** Called by the orders module when an order is cancelled or expires. */
  readonly releaseListingUnit: ReleaseListingUnit;
  /** Called by the orders module when an order is paid (UC-004). */
  readonly markReservedUnitSold: MarkReservedUnitSold;
  readonly browseActiveListings: BrowseActiveListings;
  readonly getListingDetail: GetListingDetail;
  readonly listOrganizationListings: ListOrganizationListings;
}
