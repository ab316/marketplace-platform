import type { Clock } from '@acme/core-contracts';

import { type ListingView, toListingView } from '../listing-view.ts';
import { loadOwnedListing } from '../load-owned-listing.ts';
import type { ListingRepository, SellerActor } from '../ports.ts';

export interface ArchiveListingCommand {
  readonly actor: SellerActor;
  readonly listingId: string;
}

/**
 * Withdraws an active listing from the catalogue. Existing orders keep their snapshot and their
 * reserved unit (UC-001 A5).
 */
export class ArchiveListing {
  readonly #listings: ListingRepository;
  readonly #clock: Clock;

  constructor(listings: ListingRepository, clock: Clock) {
    this.#listings = listings;
    this.#clock = clock;
  }

  async execute(command: ArchiveListingCommand): Promise<ListingView> {
    const listing = await loadOwnedListing(this.#listings, command.listingId, command.actor);

    listing.archive(this.#clock.now());
    await this.#listings.save(listing);
    return toListingView(listing);
  }
}
