import { ListingNotFoundError } from '../../domain/errors.ts';
import { type ListingView, type WithSeller, toListingView, withSeller } from '../listing-view.ts';
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

  async execute(query: GetListingDetailQuery): Promise<WithSeller<ListingView>> {
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

    const seller = await this.#organizations.findSeller(listing.organizationId);

    // A listing whose seller cannot be resolved is unattributable, and a buyer is never shown an
    // offer without a counterparty. Organizations are never deleted (PD-0003), so this means the
    // data is broken rather than that the seller went away.
    if (seller === null) {
      throw new ListingNotFoundError(query.listingId);
    }

    // A deactivated seller leaves the catalogue entirely (UC-003 E6). Hiding it from browse but
    // still serving it by direct id would leave a shareable link to an unorderable listing.
    if (!privileged && !seller.isActive) {
      throw new ListingNotFoundError(query.listingId);
    }

    return withSeller(toListingView(listing), {
      organizationId: seller.organizationId,
      name: seller.name,
    });
  }
}
