import type { Clock } from '@acme/core-contracts';

import {
  ListingConcurrencyError,
  ListingNotFoundError,
  ListingUnavailableError,
} from '../../domain/errors.ts';
import { type ListingView, toListingView } from '../listing-view.ts';
import type { ListingRepository } from '../ports.ts';

export interface MarkReservedUnitSoldCommand {
  readonly listingId: string;
}

const MAX_ATTEMPTS = 5;

/** Closes the sale of a held unit once its order is paid (UC-004 P5, PD-0004 §4). */
export class MarkReservedUnitSold {
  readonly #listings: ListingRepository;
  readonly #clock: Clock;

  constructor(listings: ListingRepository, clock: Clock) {
    this.#listings = listings;
    this.#clock = clock;
  }

  async execute(command: MarkReservedUnitSoldCommand): Promise<ListingView> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      // oxlint-disable-next-line no-await-in-loop -- each attempt must see the previous one's result
      const listing = await this.#listings.findById(command.listingId);
      if (listing === null) {
        throw new ListingNotFoundError(command.listingId);
      }

      listing.markReservedUnitSold(this.#clock.now());

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
