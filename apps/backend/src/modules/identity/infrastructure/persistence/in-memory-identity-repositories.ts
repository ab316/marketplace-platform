import type {
  OrganizationPage,
  OrganizationRepository,
  OrganizationSearchCriteria,
  SessionRepository,
  UserRepository,
} from '../../application/ports.ts';
import {
  AlreadyInOrganizationError,
  EmailAlreadyRegisteredError,
  OrganizationConcurrencyError,
} from '../../domain/errors.ts';
import { Organization, type OrganizationState } from '../../domain/organization.ts';
import { Session, type SessionState } from '../../domain/session.ts';
import { User, type UserState } from '../../domain/user.ts';

/**
 * Process-local identity stores used by the `memory` persistence mode and by tests, so the API
 * can be exercised without a database. They reproduce the uniqueness and optimistic-locking
 * guarantees the Postgres repositories get from constraints; they do not reproduce SQL semantics.
 */
export class InMemoryUserRepository implements UserRepository {
  readonly #rows = new Map<string, UserState>();

  findById(userId: string): Promise<User | null> {
    const state = this.#rows.get(userId);
    return Promise.resolve(state === undefined ? null : User.restore(state));
  }

  findByEmail(email: string): Promise<User | null> {
    const found = [...this.#rows.values()].find((state) => state.email === email);
    return Promise.resolve(found === undefined ? null : User.restore(found));
  }

  findManyByIds(userIds: readonly string[]): Promise<readonly User[]> {
    const found = userIds
      .map((userId) => this.#rows.get(userId))
      .filter((state): state is UserState => state !== undefined)
      .map((state) => User.restore(state));
    return Promise.resolve(found);
  }

  insert(user: User): Promise<void> {
    const taken = [...this.#rows.values()].some((state) => state.email === user.email);
    if (taken) {
      return Promise.reject(new EmailAlreadyRegisteredError());
    }

    this.#rows.set(user.id, user.state);
    return Promise.resolve();
  }

  save(user: User): Promise<void> {
    this.#rows.set(user.id, user.state);
    return Promise.resolve();
  }
}

export class InMemoryOrganizationRepository implements OrganizationRepository {
  readonly #rows = new Map<string, OrganizationState>();

  findById(organizationId: string): Promise<Organization | null> {
    const state = this.#rows.get(organizationId);
    return Promise.resolve(state === undefined ? null : Organization.restore(state));
  }

  findByMemberUserId(userId: string): Promise<Organization | null> {
    const found = [...this.#rows.values()].find((state) =>
      state.members.some((member) => member.userId === userId)
    );
    return Promise.resolve(found === undefined ? null : Organization.restore(found));
  }

  insert(organization: Organization): Promise<void> {
    const conflict = this.#findMembershipConflict(organization);
    if (conflict !== null) {
      return Promise.reject(
        new AlreadyInOrganizationError('That user already belongs to an organization.', {
          userId: conflict,
        })
      );
    }

    this.#rows.set(organization.id, organization.state);
    return Promise.resolve();
  }

  save(organization: Organization): Promise<void> {
    const stored = this.#rows.get(organization.id);
    if (stored === undefined || stored.version !== organization.version) {
      return Promise.reject(new OrganizationConcurrencyError(organization.id));
    }

    const conflict = this.#findMembershipConflict(organization);
    if (conflict !== null) {
      return Promise.reject(
        new AlreadyInOrganizationError('That user already belongs to an organization.', {
          userId: conflict,
        })
      );
    }

    this.#rows.set(organization.id, { ...organization.state, version: organization.version + 1 });
    return Promise.resolve();
  }

  search(criteria: OrganizationSearchCriteria): Promise<OrganizationPage> {
    const matched = [...this.#rows.values()]
      .filter((state) => criteria.status === undefined || state.status === criteria.status)
      .toSorted((left, right) => {
        const byTime = right.createdAt.getTime() - left.createdAt.getTime();
        if (byTime !== 0) {
          return byTime;
        }
        if (left.id === right.id) {
          return 0;
        }
        return left.id < right.id ? 1 : -1;
      });

    return Promise.resolve({
      items: matched
        .slice(criteria.offset, criteria.offset + criteria.limit)
        .map((state) => Organization.restore(state)),
      total: matched.length,
    });
  }

  /** Mirrors the unique index on `organization_memberships.user_id` (one organization per user). */
  #findMembershipConflict(organization: Organization): string | null {
    for (const member of organization.members) {
      for (const [id, state] of this.#rows) {
        if (id === organization.id) {
          continue;
        }
        if (state.members.some((other) => other.userId === member.userId)) {
          return member.userId;
        }
      }
    }
    return null;
  }
}

export class InMemorySessionRepository implements SessionRepository {
  readonly #rows = new Map<string, SessionState>();

  findByTokenHash(tokenHash: string): Promise<Session | null> {
    const found = [...this.#rows.values()].find((state) => state.tokenHash === tokenHash);
    return Promise.resolve(found === undefined ? null : Session.restore(found));
  }

  insert(session: Session): Promise<void> {
    this.#rows.set(session.id, session.state);
    return Promise.resolve();
  }

  save(session: Session): Promise<void> {
    this.#rows.set(session.id, session.state);
    return Promise.resolve();
  }

  revokeAllForUser(userId: string, now: Date): Promise<void> {
    for (const [id, state] of this.#rows) {
      if (state.userId === userId && state.revokedAt === null) {
        this.#rows.set(id, { ...state, revokedAt: now });
      }
    }
    return Promise.resolve();
  }
}
