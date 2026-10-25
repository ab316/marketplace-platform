import { ListingNotFoundError } from '../../domain/errors.ts';
import { type ListingView, toListingView } from '../listing-view.ts';
import type { ListingRepository, OrganizationDirectory } from '../ports.ts';

export interface GetListingDetailQuery {
  readonly listingId: string;
  /** When the viewer belongs to the owning organization they also see drafts and archives. */
  readonly viewerOrganizationId?: string | undefined;
  /** Marketplace staff inspect any listing in any status (UC-003 A1). */
  readonly viewerIsPlatformAdmin?: boolean | undefined;
}

export class GetListingDetail {
  readonly #listings: ListingRepository;
  readonly #organizations: OrganizationDirectory;

  constructor(listings: ListingRepository, organizations: OrganizationDirectory) {
    this.#listings = listings;
    this.#organizations = organizations;
  }

  async execute(query: GetListingDetailQuery): Promise<ListingView> {
    const listing = await this.#listings.findById(query.listingId);
    if (listing === null) {
      throw new ListingNotFoundError(query.listingId);
    }

    const isOwner =
      query.viewerOrganizationId !== undefined &&
      query.viewerOrganizationId === listing.organizationId;
    const privileged = isOwner || query.viewerIsPlatformAdmin === true;

    // A draft has never been published, so to anyone outside the organization it does not exist.
    if (listing.status === 'draft' && !privileged) {
      throw new ListingNotFoundError(query.listingId);
    }

    // A deactivated seller leaves the catalogue entirely (UC-003 E6). Hiding it from browse but
    // still serving it by direct id would leave a shareable link to an unorderable listing.
    if (!privileged && !(await this.#organizations.isActive(listing.organizationId))) {
      throw new ListingNotFoundError(query.listingId);
    }

    return toListingView(listing);
  }
}
