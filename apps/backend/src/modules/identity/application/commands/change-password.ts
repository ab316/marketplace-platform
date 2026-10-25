import type { Clock } from '@acme/core-contracts';

import { InvalidCredentialsError, UserNotFoundError } from '../../domain/errors.ts';
import type { PasswordHasher, SessionRepository, UserRepository } from '../ports.ts';

export interface ChangePasswordCommand {
  readonly userId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
}

/**
 * Changes a signed-in user's password (UC-002 E5) and revokes every session they hold, so a
 * stolen token dies with the password it was obtained under.
 */
export class ChangePassword {
  readonly #users: UserRepository;
  readonly #sessions: SessionRepository;
  readonly #passwords: PasswordHasher;
  readonly #clock: Clock;

  constructor(
    users: UserRepository,
    sessions: SessionRepository,
    passwords: PasswordHasher,
    clock: Clock
  ) {
    this.#users = users;
    this.#sessions = sessions;
    this.#passwords = passwords;
    this.#clock = clock;
  }

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.#users.findById(command.userId);
    if (user === null) {
      throw new UserNotFoundError({ userId: command.userId });
    }

    if (!(await this.#passwords.verify(user.passwordHash, command.currentPassword))) {
      throw new InvalidCredentialsError();
    }

    const now = this.#clock.now();
    user.changePassword(await this.#passwords.hash(command.newPassword), now);

    await this.#users.save(user);
    await this.#sessions.revokeAllForUser(user.id, now);
  }
}
