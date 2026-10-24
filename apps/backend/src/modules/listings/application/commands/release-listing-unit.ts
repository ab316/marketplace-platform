import type { Clock } from '@acme/core-contracts';

import {
  ListingConcurrencyError,
  ListingNotFoundError,
  ListingUnavailableError,
} from '../../domain/errors.ts';
import { type ListingView, toListingView } from '../listing-view.ts';
import type { ListingRepository } from '../ports.ts';

export interface ReleaseListingUnitCommand {
  readonly listingId: string;
}

const MAX_ATTEMPTS = 5;

/** Returns a held unit to available stock when an unpaid order is cancelled or expires. */
export class ReleaseListingUnit {
  readonly #listings: ListingRepository;
  readonly #clock: Clock;

  constructor(listings: ListingRepository, clock: Clock) {
    this.#listings = listings;
    this.#clock = clock;
  }

  async execute(command: ReleaseListingUnitCommand): Promise<ListingView> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      // oxlint-disable-next-line no-await-in-loop -- each attempt must see the previous one's result
      const listing = await this.#listings.findById(command.listingId);
      if (listing === null) {
        throw new ListingNotFoundError(command.listingId);
      }

      listing.releaseUnit(this.#clock.now());

      try {
        // oxlint-disable-next-line no-await-in-loop -- sequential by design; see above
        await this.#listings.save(listing);
        return toListingView(listing);
      } catch (error) {
        if (!(error instanceof ListingConcurrencyError) || attempt === MAX_ATTEMPTS) {
          throw error;
        }
      }
    }

    throw new ListingUnavailableError('This listing is busy right now. Please try again.', {
      listingId: command.listingId,
    });
  }
}
