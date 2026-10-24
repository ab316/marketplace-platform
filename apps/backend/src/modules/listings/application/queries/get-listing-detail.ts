import { ListingNotFoundError } from '../../domain/errors.ts';
import { type ListingView, toListingView } from '../listing-view.ts';
import type { ListingRepository } from '../ports.ts';

export interface GetListingDetailQuery {
  readonly listingId: string;
  /** When the viewer belongs to the owning organization they also see drafts and archives. */
  readonly viewerOrganizationId?: string | undefined;
}

export class GetListingDetail {
  readonly #listings: ListingRepository;

  constructor(listings: ListingRepository) {
    this.#listings = listings;
  }

  async execute(query: GetListingDetailQuery): Promise<ListingView> {
    const listing = await this.#listings.findById(query.listingId);
    if (listing === null) {
      throw new ListingNotFoundError(query.listingId);
    }

    const isOwner =
      query.viewerOrganizationId !== undefined &&
      query.viewerOrganizationId === listing.organizationId;

    // A draft has never been published, so to anyone outside the organization it does not exist.
    if (listing.status === 'draft' && !isOwner) {
      throw new ListingNotFoundError(query.listingId);
    }

    return toListingView(listing);
  }
}
