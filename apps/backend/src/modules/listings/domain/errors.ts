import { DomainError, type ErrorDetails } from '@acme/core-domain';

export class ListingNotFoundError extends DomainError {
  constructor(listingId: string) {
    super('not_found', 'LISTING_NOT_FOUND', 'Listing not found.', { listingId });
  }
}

/** The actor is not allowed to manage listings for the owning organization. */
export class ListingAccessDeniedError extends DomainError {
  constructor(listingId: string) {
    super('forbidden', 'LISTING_ACCESS_DENIED', 'You cannot manage this listing.', { listingId });
  }
}

export class InvalidListingDataError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('validation', 'INVALID_LISTING_DATA', message, details);
  }
}

/** The listing is in a status that does not permit the requested transition. */
export class ListingStateError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('conflict', 'LISTING_STATE_CONFLICT', message, details);
  }
}

/** The listing cannot take a new order: not active, or every unit is already reserved. */
export class ListingUnavailableError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('conflict', 'LISTING_UNAVAILABLE', message, details);
  }
}

/** The listing changed between read and write; the caller should retry with fresh state. */
export class ListingConcurrencyError extends DomainError {
  constructor(listingId: string) {
    super('conflict', 'LISTING_CONCURRENCY_CONFLICT', 'Listing was modified concurrently.', {
      listingId,
    });
  }
}
