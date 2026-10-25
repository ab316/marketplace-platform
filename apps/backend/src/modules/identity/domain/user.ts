import { InvalidUserDataError } from './errors.ts';

/**
 * Platform-wide standing. `member` is everyone who signs up; `platform_admin` is marketplace
 * staff, provisioned manually and never through sign-up (PD-0003).
 */
export type PlatformRole = 'member' | 'platform_admin';

export interface UserState {
  readonly id: string;
  /** Normalized to lowercase; the unique login identifier. */
  readonly email: string;
  readonly displayName: string;
  /** Argon2id digest (ADR-008). Never logged, never returned over HTTP. */
  readonly passwordHash: string;
  readonly platformRole: PlatformRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface RegisterUserInput {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly passwordHash: string;
  readonly now: Date;
}

/**
 * A person who can sign in.
 *
 * Invariants:
 * - Email is stored normalized, so uniqueness is case-insensitive.
 * - A display name is always present, because it is what other members see.
 * - Platform-admin standing is never self-assigned; only `grantPlatformAdmin` sets it.
 */
export class User {
  #state: UserState;

  private constructor(state: UserState) {
    this.#state = state;
  }

  static register(input: RegisterUserInput): User {
    const email = normalizeEmail(input.email);
    if (email.length === 0) {
      throw new InvalidUserDataError('An email address is required.');
    }
    if (input.displayName.trim().length === 0) {
      throw new InvalidUserDataError('A display name is required.');
    }
    if (input.passwordHash.length === 0) {
      throw new InvalidUserDataError('A password is required.');
    }

    return new User({
      id: input.id,
      email,
      displayName: input.displayName.trim(),
      passwordHash: input.passwordHash,
      platformRole: 'member',
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  /** Rehydrates persisted state without re-running registration rules. */
  static restore(state: UserState): User {
    return new User(state);
  }

  get state(): UserState {
    return this.#state;
  }

  get id(): string {
    return this.#state.id;
  }

  get email(): string {
    return this.#state.email;
  }

  get displayName(): string {
    return this.#state.displayName;
  }

  get passwordHash(): string {
    return this.#state.passwordHash;
  }

  get isPlatformAdmin(): boolean {
    return this.#state.platformRole === 'platform_admin';
  }

  changePassword(passwordHash: string, now: Date): void {
    if (passwordHash.length === 0) {
      throw new InvalidUserDataError('A password is required.');
    }
    this.#state = { ...this.#state, passwordHash, updatedAt: now };
  }

  /** Called only by the manual provisioning command, never by an HTTP route (PD-0003). */
  grantPlatformAdmin(now: Date): void {
    this.#state = { ...this.#state, platformRole: 'platform_admin', updatedAt: now };
  }
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
