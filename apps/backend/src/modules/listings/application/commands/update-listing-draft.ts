import type { Clock } from '@acme/core-contracts';

import { applyDraftPatch, type ListingDraftPatch } from '../draft-patch.ts';
import { type ListingView, toListingView } from '../listing-view.ts';
import { loadOwnedListing } from '../load-owned-listing.ts';
import type { ListingRepository, SellerActor } from '../ports.ts';

/**
 * Changes to a draft (UC-007): omitted fields keep their value, `null` clears a field, and nested
 * objects merge field by field.
 */
export interface UpdateListingDraftCommand extends ListingDraftPatch {
  readonly actor: SellerActor;
  readonly listingId: string;
}

export class UpdateListingDraft {
  readonly #listings: ListingRepository;
  readonly #clock: Clock;

  constructor(listings: ListingRepository, clock: Clock) {
    this.#listings = listings;
    this.#clock = clock;
  }

  async execute(command: UpdateListingDraftCommand): Promise<ListingView> {
    const { actor, listingId, ...patch } = command;
    const listing = await loadOwnedListing(this.#listings, listingId, actor);

    // `revise` refuses anything but a draft: published content is frozen (spec D2).
    listing.revise(applyDraftPatch(listing.state, patch), this.#clock.now());
    // Optimistic save: two saves racing on the same version leave one with a conflict. Separate
    // saves are last-write-wins (spec D11).
    await this.#listings.save(listing);
    return toListingView(listing);
  }
}
