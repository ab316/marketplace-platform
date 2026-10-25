import type { Clock } from '@acme/core-contracts';

import type { SessionRepository, SessionTokenFactory } from '../ports.ts';

export interface SignOutCommand {
  readonly token: string;
}

/**
 * Revokes the presented session (UC-002 M6). Revocation is immediate: the next request resolves
 * the session from storage and finds it unusable (ADR-008).
 *
 * Signing out with an already-invalid token succeeds silently — there is nothing to protect and
 * reporting the difference would leak which tokens exist.
 */
export class SignOut {
  readonly #sessions: SessionRepository;
  readonly #tokens: SessionTokenFactory;
  readonly #clock: Clock;

  constructor(sessions: SessionRepository, tokens: SessionTokenFactory, clock: Clock) {
    this.#sessions = sessions;
    this.#tokens = tokens;
    this.#clock = clock;
  }

  async execute(command: SignOutCommand): Promise<void> {
    const session = await this.#sessions.findByTokenHash(this.#tokens.hash(command.token));
    if (session === null) {
      return;
    }

    session.revoke(this.#clock.now());
    await this.#sessions.save(session);
  }
}
