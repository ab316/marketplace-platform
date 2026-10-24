import type { Clock, IdGenerator } from '@acme/core-contracts';
import { type Currency, Money } from '@acme/core-domain';

import {
  Listing,
  type ListingCondition,
  type ListingSpecifications,
} from '../../domain/listing.ts';
import { type ListingView, toListingView } from '../listing-view.ts';
import type { ListingRepository, SellerActor } from '../ports.ts';

export interface CreateListingDraftCommand {
  readonly actor: SellerActor;
  readonly title: string;
  readonly description: string;
  readonly specifications: ListingSpecifications;
  readonly condition: ListingCondition;
  readonly priceMinor: number;
  readonly currency: Currency;
  readonly quantityTotal: number;
  readonly fulfillmentExpectations: string;
}

export class CreateListingDraft {
  readonly #listings: ListingRepository;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(listings: ListingRepository, clock: Clock, ids: IdGenerator) {
    this.#listings = listings;
    this.#clock = clock;
    this.#ids = ids;
  }

  async execute(command: CreateListingDraftCommand): Promise<ListingView> {
    const listing = Listing.createDraft({
      id: this.#ids.next(),
      organizationId: command.actor.organizationId,
      title: command.title,
      description: command.description,
      specifications: command.specifications,
      condition: command.condition,
      price: Money.fromMinor(command.priceMinor, command.currency),
      totalQuantity: command.quantityTotal,
      fulfillmentExpectations: command.fulfillmentExpectations,
      now: this.#clock.now(),
    });

    await this.#listings.insert(listing);
    return toListingView(listing);
  }
}
