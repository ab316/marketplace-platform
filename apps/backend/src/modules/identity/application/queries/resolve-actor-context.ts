import type { Clock } from '@acme/core-contracts';

import { type ActorContext, buildActorContext } from '../actor-context.ts';
import type {
  OrganizationRepository,
  SessionRepository,
  SessionTokenFactory,
  UserRepository,
} from '../ports.ts';

export interface ResolveActorContextQuery {
  readonly token: string;
}

/**
 * Turns a bearer token into the caller's identity, role, and membership — on every request
 * (ADR-008).
 *
 * Reading membership from storage per request is what makes revocation immediate: removing a
 * member, changing their role, or deactivating their organization takes effect on their very
 * next call, with no token to re-issue and no staleness window.
 *
 * Returns `null` for any token that is unknown, expired, revoked, or orphaned; the caller
 * decides whether that means "anonymous" or "unauthenticated".
 */
export class ResolveActorContext {
  readonly #users: UserRepository;
  readonly #organizations: OrganizationRepository;
  readonly #sessions: SessionRepository;
  readonly #tokens: SessionTokenFactory;
  readonly #clock: Clock;

  constructor(
    users: UserRepository,
    organizations: OrganizationRepository,
    sessions: SessionRepository,
    tokens: SessionTokenFactory,
    clock: Clock
  ) {
    this.#users = users;
    this.#organizations = organizations;
    this.#sessions = sessions;
    this.#tokens = tokens;
    this.#clock = clock;
  }

  async execute(query: ResolveActorContextQuery): Promise<ActorContext | null> {
    const session = await this.#sessions.findByTokenHash(this.#tokens.hash(query.token));
    if (session === null || !session.isUsableAt(this.#clock.now())) {
      return null;
    }

    const user = await this.#users.findById(session.userId);
    if (user === null) {
      return null;
    }

    const organization = await this.#organizations.findByMemberUserId(user.id);
    return buildActorContext(user, organization);
  }
}
