import type { Clock, IdGenerator } from '@acme/core-contracts';

import { Listing, type ListingFields } from '../domain/listing.ts';
import {
  ListingNotFoundError,
  ListingVersionConflictError,
  type ListingRepository,
} from './ports.ts';

export type ListingsServiceDeps = {
  listingRepository: ListingRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

export class ForbiddenListingAccessError extends Error {
  readonly code = 'FORBIDDEN_LISTING_ACCESS';

  constructor() {
    super('Listing belongs to a different organization');
    this.name = 'ForbiddenListingAccessError';
  }
}

// Public application API of the listings module. Other modules (orders) may
// only interact with listings through these commands/queries.
export function createListingsService(deps: ListingsServiceDeps) {
  const { listingRepository, clock, idGenerator } = deps;

  async function loadOwned(listingId: string, organizationId: string): Promise<Listing> {
    const listing = await listingRepository.findById(listingId);
    if (!listing) {
      throw new ListingNotFoundError(listingId);
    }
    if (listing.props.organizationId !== organizationId) {
      throw new ForbiddenListingAccessError();
    }
    return listing;
  }

  return {
    async createListingDraft(input: {
      organizationId: string;
      fields: ListingFields;
    }): Promise<Listing> {
      const listing = Listing.createDraft({
        id: idGenerator.next(),
        organizationId: input.organizationId,
        fields: input.fields,
        now: clock.now(),
      });
      await listingRepository.insert(listing);
      return listing;
    },

    async updateListingDraft(input: {
      listingId: string;
      organizationId: string;
      fields: ListingFields;
    }): Promise<Listing> {
      const listing = await loadOwned(input.listingId, input.organizationId);
      listing.updateDraft(input.fields, clock.now());
      await listingRepository.update(listing);
      return listing;
    },

    async publishListing(input: { listingId: string; organizationId: string }): Promise<Listing> {
      const listing = await loadOwned(input.listingId, input.organizationId);
      listing.publish(clock.now());
      await listingRepository.update(listing);
      return listing;
    },

    async archiveListing(input: { listingId: string; organizationId: string }): Promise<Listing> {
      const listing = await loadOwned(input.listingId, input.organizationId);
      listing.archive(clock.now());
      await listingRepository.update(listing);
      return listing;
    },

    async browseActiveListings(search?: string): Promise<Listing[]> {
      return listingRepository.searchActive(search);
    },

    async getListing(listingId: string): Promise<Listing> {
      const listing = await listingRepository.findById(listingId);
      if (!listing) {
        throw new ListingNotFoundError(listingId);
      }
      return listing;
    },

    // Reserves one unit for an order. Optimistic locking makes concurrent
    // reservations of the last unit fail instead of overselling (UC-001 A3);
    // version conflicts are retried so a loser only fails when stock is
    // genuinely gone.
    async reserveListingUnit(listingId: string): Promise<Listing> {
      const MAX_ATTEMPTS = 3;
      // oxlint-disable no-await-in-loop -- retries are inherently sequential
      for (let attempt = 1; ; attempt += 1) {
        const listing = await listingRepository.findById(listingId);
        if (!listing) {
          throw new ListingNotFoundError(listingId);
        }
        listing.reserveUnit(clock.now());
        try {
          await listingRepository.update(listing);
          return listing;
        } catch (error) {
          if (error instanceof ListingVersionConflictError && attempt < MAX_ATTEMPTS) {
            continue;
          }
          throw error;
        }
      }
    },

    // Returns a reserved unit to stock after an unpaid order is cancelled.
    async releaseListingUnit(listingId: string): Promise<void> {
      const listing = await listingRepository.findById(listingId);
      if (!listing) {
        throw new ListingNotFoundError(listingId);
      }
      listing.releaseUnit(clock.now());
      await listingRepository.update(listing);
    },
  };
}

export type ListingsService = ReturnType<typeof createListingsService>;
