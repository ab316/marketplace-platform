export class ListingDomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ListingDomainError';
    this.code = code;
  }
}

export class ListingNotPublishableError extends ListingDomainError {
  readonly missingFields: readonly string[];

  constructor(missingFields: readonly string[]) {
    super(
      'LISTING_NOT_PUBLISHABLE',
      `Listing cannot be published; missing or invalid fields: ${missingFields.join(', ')}`
    );
    this.name = 'ListingNotPublishableError';
    this.missingFields = missingFields;
  }
}

export class InvalidListingStateError extends ListingDomainError {
  constructor(message: string) {
    super('INVALID_LISTING_STATE', message);
    this.name = 'InvalidListingStateError';
  }
}

export class NoAvailableStockError extends ListingDomainError {
  constructor() {
    super('NO_AVAILABLE_STOCK', 'Listing has no available units to reserve');
    this.name = 'NoAvailableStockError';
  }
}
