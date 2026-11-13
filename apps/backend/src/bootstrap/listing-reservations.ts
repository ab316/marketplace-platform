import { DomainError } from '@acme/core-domain';

import type { ListingsModuleApi } from '../modules/listings/listings.api.ts';
import type { ListingReservations } from '../modules/orders/application/ports.ts';

/**
 * Connects the orders module's reservation port to the listings module's public API.
 *
 * Cross-module collaboration is wired here, in the application composition root, so neither module
 * imports the other and stock stays owned by listings alone.
 */
export const createListingReservations = (listings: ListingsModuleApi): ListingReservations => ({
  reserve: async (listingId) => {
    const listing = await listings.reserveListingUnit.execute({ listingId });

    return {
      listingId: listing.id,
      sellerOrganizationId: listing.organizationId,
      title: listing.title,
      description: listing.description,
      specifications: listing.specifications,
      condition: listing.condition,
      priceMinor: listing.price.amountMinor,
      currency: listing.price.currency,
      fulfillmentExpectations: listing.fulfillmentExpectations,
    };
  },

  release: async (listingId) => {
    await listings.releaseListingUnit.execute({ listingId });
  },

  markSold: async (listingId) => {
    await listings.markReservedUnitSold.execute({ listingId });
  },

  // Who sells the listing, read without touching stock, so order eligibility (P1-021) is decided
  // before anything is reserved. A listing the detail query will not serve (unknown, draft,
  // deactivated seller) answers `null`; the reservation then produces the canonical refusal.
  sellerOrganizationOf: async (listingId) => {
    try {
      const listing = await listings.getListingDetail.execute({ listingId });
      return listing.organizationId;
    } catch (error) {
      if (error instanceof DomainError && error.code === 'LISTING_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  },
});
