export interface SessionState {
  readonly id: string;
  readonly userId: string;
  /**
   * Digest of the opaque bearer token (ADR-008). The raw token is returned to the client once at
   * sign-in and never stored, so a database leak cannot be replayed as a live session.
   */
  readonly tokenHash: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

export interface IssueSessionInput {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly now: Date;
  readonly expiresAt: Date;
}

/**
 * A signed-in period for one user.
 *
 * Invariants:
 * - A session is usable only while it is neither expired nor revoked.
 * - Revocation is terminal; a revoked session never becomes valid again.
 */
export class Session {
  #state: SessionState;

  private constructor(state: SessionState) {
    this.#state = state;
  }

  static issue(input: IssueSessionInput): Session {
    return new Session({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      createdAt: input.now,
      expiresAt: input.expiresAt,
      revokedAt: null,
    });
  }

  static restore(state: SessionState): Session {
    return new Session(state);
  }

  get state(): SessionState {
    return this.#state;
  }

  get id(): string {
    return this.#state.id;
  }

  get userId(): string {
    return this.#state.userId;
  }

  get expiresAt(): Date {
    return this.#state.expiresAt;
  }

  isUsableAt(now: Date): boolean {
    return this.#state.revokedAt === null && this.#state.expiresAt.getTime() > now.getTime();
  }

  revoke(now: Date): void {
    if (this.#state.revokedAt === null) {
      this.#state = { ...this.#state, revokedAt: now };
    }
  }
}
