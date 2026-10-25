import type { Clock } from '@acme/core-contracts';

import { UserNotFoundError } from '../../domain/errors.ts';
import { normalizeEmail } from '../../domain/user.ts';
import type { UserRepository } from '../ports.ts';

export interface ProvisionPlatformAdminCommand {
  readonly email: string;
}

/**
 * Grants marketplace-staff standing to an existing account.
 *
 * Deliberately **not** exposed over HTTP (PD-0003): platform admins are provisioned out of band
 * by an operator running a script, so no API path can ever escalate a user to staff. Already
 * being an admin is not an error, which keeps the seed script re-runnable.
 */
export class ProvisionPlatformAdmin {
  readonly #users: UserRepository;
  readonly #clock: Clock;

  constructor(users: UserRepository, clock: Clock) {
    this.#users = users;
    this.#clock = clock;
  }

  async execute(command: ProvisionPlatformAdminCommand): Promise<void> {
    const user = await this.#users.findByEmail(normalizeEmail(command.email));
    if (user === null) {
      throw new UserNotFoundError({ email: command.email });
    }
    if (user.isPlatformAdmin) {
      return;
    }

    user.grantPlatformAdmin(this.#clock.now());
    await this.#users.save(user);
  }
}
