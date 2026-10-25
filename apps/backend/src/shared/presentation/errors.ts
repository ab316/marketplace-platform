import { DomainError, type ErrorDetails } from '@acme/core-domain';

export class AuthenticationRequiredError extends DomainError {
  constructor() {
    super(
      'unauthenticated',
      'AUTHENTICATION_REQUIRED',
      'Sign in and send the session token as an Authorization: Bearer header.'
    );
  }
}

/** The caller is signed in but belongs to no seller organization (a buyer-only account). */
export class OrganizationRequiredError extends DomainError {
  constructor() {
    super(
      'forbidden',
      'ORGANIZATION_REQUIRED',
      'This action requires membership of a seller organization.'
    );
  }
}

export class RequestValidationError extends DomainError {
  constructor(details: ErrorDetails) {
    super('validation', 'VALIDATION_FAILED', 'The request is invalid.', details);
  }
}
