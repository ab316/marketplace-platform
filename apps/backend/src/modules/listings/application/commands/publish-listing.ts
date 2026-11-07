import type { Clock } from '@acme/core-contracts';

import { type PublishedListingView, toPublishedListingView } from '../listing-view.ts';
import { loadOwnedListing } from '../load-owned-listing.ts';
import type { ListingRepository, SellerActor } from '../ports.ts';

export interface PublishListingCommand {
  readonly actor: SellerActor;
  readonly listingId: string;
}

/**
 * Makes a draft visible and orderable (UC-008). Rejected with every missing or invalid field at
 * once (`LISTING_INCOMPLETE`) unless the draft meets the publish bar.
 */
export class PublishListing {
  readonly #listings: ListingRepository;
  readonly #clock: Clock;

  constructor(listings: ListingRepository, clock: Clock) {
    this.#listings = listings;
    this.#clock = clock;
  }

  async execute(command: PublishListingCommand): Promise<PublishedListingView> {
    const listing = await loadOwnedListing(this.#listings, command.listingId, command.actor);

    listing.publish(this.#clock.now());
    await this.#listings.save(listing);
    return toPublishedListingView(listing);
  }
}
