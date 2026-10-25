import type { Organization } from '../domain/organization.ts';
import type { Session } from '../domain/session.ts';
import type { User } from '../domain/user.ts';

export interface UserRepository {
  findById(userId: string): Promise<User | null>;

  /** `email` is expected to be normalized; uniqueness is case-insensitive. */
  findByEmail(email: string): Promise<User | null>;

  findManyByIds(userIds: readonly string[]): Promise<readonly User[]>;

  /**
   * Fails with `EmailAlreadyRegisteredError` when the email is taken, so a concurrent duplicate
   * sign-up loses at the database's unique index rather than creating a second account.
   */
  insert(user: User): Promise<void>;

  save(user: User): Promise<void>;
}

export interface OrganizationPage {
  readonly items: readonly Organization[];
  readonly total: number;
}

export interface OrganizationSearchCriteria {
  readonly status?: 'active' | 'deactivated' | undefined;
  readonly limit: number;
  readonly offset: number;
}

export interface OrganizationRepository {
  findById(organizationId: string): Promise<Organization | null>;

  /** One organization per user (PD-0003), so a membership resolves to a single organization. */
  findByMemberUserId(userId: string): Promise<Organization | null>;

  /**
   * Persists the organization with its members and audit entries. Fails with
   * `AlreadyInOrganizationError` if a member already belongs elsewhere.
   */
  insert(organization: Organization): Promise<void>;

  /**
   * Persists a loaded aggregate using its version as an optimistic guard, so concurrent
   * membership changes cannot overwrite each other. Throws `OrganizationConcurrencyError` when
   * the stored version has moved on.
   */
  save(organization: Organization): Promise<void>;

  search(criteria: OrganizationSearchCriteria): Promise<OrganizationPage>;
}

export interface SessionRepository {
  findByTokenHash(tokenHash: string): Promise<Session | null>;

  insert(session: Session): Promise<void>;

  save(session: Session): Promise<void>;

  /** Used when a password change must invalidate every signed-in device (UC-002 E5). */
  revokeAllForUser(userId: string, now: Date): Promise<void>;
}

/** Password hashing, kept behind a port so the algorithm is an infrastructure choice (ADR-008). */
export interface PasswordHasher {
  hash(password: string): Promise<string>;

  /**
   * Must take comparable time whether or not the digest matches, and must not throw for a
   * malformed digest — sign-in timing should not reveal whether an account exists.
   */
  verify(passwordHash: string, password: string): Promise<boolean>;

  /**
   * Does the same work as `verify` against a throwaway digest. Sign-in calls this when no account
   * matches, so an unknown email costs the same time as a wrong password (UC-002 E2).
   */
  verifyDummy(password: string): Promise<void>;
}

/** Generates opaque session tokens and their stored digests (ADR-008). */
export interface SessionTokenFactory {
  /** Returns a fresh unguessable token and the digest to persist. */
  create(): { token: string; tokenHash: string };

  /** Digest of a presented token, for looking the session up. */
  hash(token: string): string;
}
