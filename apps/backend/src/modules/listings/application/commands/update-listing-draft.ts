import type { Clock } from '@acme/core-contracts';
import { type Currency, Money } from '@acme/core-domain';

import type {
  ListingCondition,
  ListingDetails,
  ListingSpecifications,
} from '../../domain/listing.ts';
import { type ListingView, toListingView } from '../listing-view.ts';
import { loadOwnedListing } from '../load-owned-listing.ts';
import type { ListingRepository, SellerActor } from '../ports.ts';

export interface UpdateListingDraftCommand {
  readonly actor: SellerActor;
  readonly listingId: string;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly specifications?: ListingSpecifications | undefined;
  readonly condition?: ListingCondition | undefined;
  readonly priceMinor?: number | undefined;
  readonly currency?: Currency | undefined;
  readonly quantityTotal?: number | undefined;
  readonly fulfillmentExpectations?: string | undefined;
}

export class UpdateListingDraft {
  readonly #listings: ListingRepository;
  readonly #clock: Clock;

  constructor(listings: ListingRepository, clock: Clock) {
    this.#listings = listings;
    this.#clock = clock;
  }

  async execute(command: UpdateListingDraftCommand): Promise<ListingView> {
    const listing = await loadOwnedListing(this.#listings, command.listingId, command.actor);

    const changes: Partial<ListingDetails> = {
      ...(command.title === undefined ? {} : { title: command.title }),
      ...(command.description === undefined ? {} : { description: command.description }),
      ...(command.specifications === undefined ? {} : { specifications: command.specifications }),
      ...(command.condition === undefined ? {} : { condition: command.condition }),
      ...(command.priceMinor === undefined
        ? {}
        : { price: Money.fromMinor(command.priceMinor, command.currency) }),
      ...(command.quantityTotal === undefined ? {} : { totalQuantity: command.quantityTotal }),
      ...(command.fulfillmentExpectations === undefined
        ? {}
        : { fulfillmentExpectations: command.fulfillmentExpectations }),
    };

    listing.update(changes, this.#clock.now());
    await this.#listings.save(listing);
    return toListingView(listing);
  }
}
