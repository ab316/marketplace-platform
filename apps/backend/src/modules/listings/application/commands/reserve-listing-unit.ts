import type { Clock } from '@acme/core-contracts';

import {
  ListingConcurrencyError,
  ListingNotFoundError,
  ListingUnavailableError,
} from '../../domain/errors.ts';
import { type ListingView, toListingView } from '../listing-view.ts';
import type { ListingRepository, OrganizationDirectory } from '../ports.ts';

export interface ReserveListingUnitCommand {
  readonly listingId: string;
}

/** Attempts before giving up on a contended listing; each retry re-reads the current stock. */
const MAX_ATTEMPTS = 5;

/**
 * Holds one unit of pooled stock for a new order.
 *
 * Reservation is the invariant that keeps the marketplace from overselling, so the write is guarded
 * by the listing's version: a concurrent reservation makes the save fail and the attempt restarts
 * from fresh state rather than overwriting it.
 */
export class ReserveListingUnit {
  readonly #listings: ListingRepository;
  readonly #organizations: OrganizationDirectory;
  readonly #clock: Clock;

  constructor(listings: ListingRepository, organizations: OrganizationDirectory, clock: Clock) {
    this.#listings = listings;
    this.#organizations = organizations;
    this.#clock = clock;
  }

  async execute(command: ReserveListingUnitCommand): Promise<ListingView> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      // oxlint-disable-next-line no-await-in-loop -- each attempt must see the previous one's result
      const listing = await this.#listings.findById(command.listingId);
      if (listing === null) {
        throw new ListingNotFoundError(command.listingId);
      }

      // A deactivated seller takes no new orders (UC-003 E6). Checked per attempt so an
      // organization deactivated mid-retry cannot slip a reservation through.
      // oxlint-disable-next-line no-await-in-loop -- sequential by design; see above
      if (!(await this.#organizations.isActive(listing.organizationId))) {
        throw new ListingUnavailableError('This seller is not currently accepting orders.', {
          listingId: command.listingId,
        });
      }

      listing.reserveUnit(this.#clock.now());

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
