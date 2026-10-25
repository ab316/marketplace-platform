import { DomainError, type ErrorDetails } from '@acme/core-domain';

/**
 * Sign-in failure. Deliberately identical for an unknown email and a wrong password so the API
 * cannot be used to discover which addresses are registered (UC-002 E2).
 */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('unauthenticated', 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }
}

export class EmailAlreadyRegisteredError extends DomainError {
  constructor() {
    super('validation', 'EMAIL_ALREADY_REGISTERED', 'That email address is already registered.', {
      location: 'body',
      issues: [{ path: 'email', message: 'That email address is already registered.' }],
    });
  }
}

export class InvalidUserDataError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('validation', 'INVALID_USER_DATA', message, details);
  }
}

export class UserNotFoundError extends DomainError {
  constructor(details?: ErrorDetails) {
    super('not_found', 'USER_NOT_FOUND', 'No account matches that email address.', details);
  }
}

export class OrganizationNotFoundError extends DomainError {
  constructor(organizationId: string) {
    super('not_found', 'ORGANIZATION_NOT_FOUND', 'Organization not found.', { organizationId });
  }
}

export class InvalidOrganizationDataError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('validation', 'INVALID_ORGANIZATION_DATA', message, details);
  }
}

/** The actor is signed in but lacks the role or organization scope the action requires. */
export class OrganizationAccessDeniedError extends DomainError {
  constructor(message = 'You cannot perform this action for this organization.') {
    super('forbidden', 'ORGANIZATION_ACCESS_DENIED', message);
  }
}

export class PlatformAdminRequiredError extends DomainError {
  constructor() {
    super(
      'forbidden',
      'PLATFORM_ADMIN_REQUIRED',
      'This action is restricted to marketplace staff.'
    );
  }
}

/** One organization per user (PD-0003). */
export class AlreadyInOrganizationError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('conflict', 'ALREADY_IN_ORGANIZATION', message, details);
  }
}

export class MemberNotFoundError extends DomainError {
  constructor(userId: string) {
    super('not_found', 'MEMBER_NOT_FOUND', 'That user is not a member of this organization.', {
      userId,
    });
  }
}

/** Every organization keeps at least one owner (UC-003 E3). */
export class LastOwnerError extends DomainError {
  constructor() {
    super(
      'conflict',
      'LAST_OWNER_REQUIRED',
      'An organization must always have at least one owner. Promote another member first.'
    );
  }
}

/** Nobody changes their own membership — the guard against privilege self-escalation (UC-003 E4). */
export class SelfMembershipChangeError extends DomainError {
  constructor() {
    super(
      'forbidden',
      'SELF_MEMBERSHIP_CHANGE',
      'You cannot change your own membership. Ask another owner.'
    );
  }
}

/** The organization is in a state that does not permit the requested transition or write. */
export class OrganizationStateError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('conflict', 'ORGANIZATION_STATE_CONFLICT', message, details);
  }
}

/** The aggregate changed between read and write; the caller should retry with fresh state. */
export class OrganizationConcurrencyError extends DomainError {
  constructor(organizationId: string) {
    super(
      'conflict',
      'ORGANIZATION_CONCURRENCY_CONFLICT',
      'Organization was modified concurrently.',
      { organizationId }
    );
  }
}
