import { DomainError, type ErrorDetails } from '@acme/core-domain';

export class AuthenticationRequiredError extends DomainError {
  constructor() {
    super(
      'unauthenticated',
      'AUTHENTICATION_REQUIRED',
      'Provide a known actor in the x-actor-id header.'
    );
  }
}

export class SellerPermissionError extends DomainError {
  constructor(message = 'This actor cannot manage listings for a seller organization.') {
    super('forbidden', 'SELLER_PERMISSION_REQUIRED', message);
  }
}

export class RequestValidationError extends DomainError {
  constructor(details: ErrorDetails) {
    super('validation', 'VALIDATION_FAILED', 'The request is invalid.', details);
  }
}
