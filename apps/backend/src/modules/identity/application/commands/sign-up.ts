import type { Clock, IdGenerator } from '@acme/core-contracts';

import { EmailAlreadyRegisteredError } from '../../domain/errors.ts';
import { User, normalizeEmail } from '../../domain/user.ts';
import { type ActorContext, buildActorContext } from '../actor-context.ts';
import type { PasswordHasher, UserRepository } from '../ports.ts';

export interface SignUpCommand {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}

/**
 * Creates an account (UC-002). The account is active immediately: email verification is a
 * deliberately deferred feature (backlog P1-008), not an oversight.
 */
export class SignUp {
  readonly #users: UserRepository;
  readonly #passwords: PasswordHasher;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(users: UserRepository, passwords: PasswordHasher, clock: Clock, ids: IdGenerator) {
    this.#users = users;
    this.#passwords = passwords;
    this.#clock = clock;
    this.#ids = ids;
  }

  async execute(command: SignUpCommand): Promise<ActorContext> {
    const email = normalizeEmail(command.email);

    // A friendly pre-check; the repository's unique index is what actually prevents a duplicate
    // when two sign-ups race.
    if ((await this.#users.findByEmail(email)) !== null) {
      throw new EmailAlreadyRegisteredError();
    }

    const user = User.register({
      id: this.#ids.next(),
      email,
      displayName: command.displayName,
      passwordHash: await this.#passwords.hash(command.password),
      now: this.#clock.now(),
    });

    await this.#users.insert(user);

    // A brand-new account never belongs to an organization.
    return buildActorContext(user, null);
  }
}
