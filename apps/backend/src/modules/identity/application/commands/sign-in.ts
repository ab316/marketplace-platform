import type { Clock, IdGenerator } from '@acme/core-contracts';

import { InvalidCredentialsError } from '../../domain/errors.ts';
import { Session } from '../../domain/session.ts';
import { normalizeEmail } from '../../domain/user.ts';
import { type ActorContext, buildActorContext } from '../actor-context.ts';
import type {
  OrganizationRepository,
  PasswordHasher,
  SessionRepository,
  SessionTokenFactory,
  UserRepository,
} from '../ports.ts';

export interface SignInCommand {
  readonly email: string;
  readonly password: string;
}

export interface SignInResult {
  readonly token: string;
  readonly expiresAt: Date;
  readonly actor: ActorContext;
}

export interface SignInDependencies {
  readonly users: UserRepository;
  readonly organizations: OrganizationRepository;
  readonly sessions: SessionRepository;
  readonly passwords: PasswordHasher;
  readonly tokens: SessionTokenFactory;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly sessionTtlMs: number;
}

/**
 * Exchanges credentials for an opaque session token (UC-002, ADR-008).
 *
 * An unknown email and a wrong password produce the same error and comparable work, so the
 * endpoint cannot be used to enumerate registered addresses.
 */
export class SignIn {
  readonly #deps: SignInDependencies;

  constructor(deps: SignInDependencies) {
    this.#deps = deps;
  }

  async execute(command: SignInCommand): Promise<SignInResult> {
    const { users, organizations, sessions, passwords, tokens, clock, ids } = this.#deps;

    const user = await users.findByEmail(normalizeEmail(command.email));
    if (user === null) {
      await passwords.verifyDummy(command.password);
      throw new InvalidCredentialsError();
    }

    if (!(await passwords.verify(user.passwordHash, command.password))) {
      throw new InvalidCredentialsError();
    }

    const now = clock.now();
    const expiresAt = new Date(now.getTime() + this.#deps.sessionTtlMs);
    const { token, tokenHash } = tokens.create();

    await sessions.insert(
      Session.issue({ id: ids.next(), userId: user.id, tokenHash, now, expiresAt })
    );

    const organization = await organizations.findByMemberUserId(user.id);
    return { token, expiresAt, actor: buildActorContext(user, organization) };
  }
}
