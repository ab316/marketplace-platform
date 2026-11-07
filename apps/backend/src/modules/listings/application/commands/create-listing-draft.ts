import type { Clock, IdGenerator } from '@acme/core-contracts';

import { Listing } from '../../domain/listing.ts';
import { applyDraftPatch, EMPTY_DRAFT, type ListingDraftPatch } from '../draft-patch.ts';
import { type ListingView, toListingView } from '../listing-view.ts';
import type { ListingRepository, SellerActor } from '../ports.ts';

/** Any subset of the listing fields, including none (UC-005, P1-012). `null` means not entered. */
export interface CreateListingDraftCommand extends ListingDraftPatch {
  readonly actor: SellerActor;
}

/**
 * Starts a draft for the actor's organization. Nothing is required; whatever is entered must be
 * well-formed. Completeness is checked only when publishing (UC-008).
 */
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
    const { actor, ...fields } = command;
    const listing = Listing.createDraft({
      ...applyDraftPatch(EMPTY_DRAFT, fields),
      id: this.#ids.next(),
      organizationId: actor.organizationId,
      now: this.#clock.now(),
    });

    await this.#listings.insert(listing);
    return toListingView(listing);
  }
}
