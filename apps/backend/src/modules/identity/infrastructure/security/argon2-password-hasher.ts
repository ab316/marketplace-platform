import { hash, verify } from '@node-rs/argon2';

import type { PasswordHasher } from '../../application/ports.ts';

/**
 * Argon2id password hashing (ADR-008).
 *
 * Argon2id is the library default, and the defaults match the OWASP minimum for it
 * (m=19456 KiB, t=2, p=1); `password-hashing.unit.spec.ts` guards that the produced digest really
 * is Argon2id rather than trusting the default silently. The parameters are recorded inside each
 * digest, so raising them later leaves existing passwords verifiable.
 */
export class Argon2PasswordHasher implements PasswordHasher {
  /** Built once and reused, so an unknown email costs one verification, not a hash plus a verify. */
  #dummyHash: Promise<string> | null = null;

  hash(password: string): Promise<string> {
    return hash(password);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      // A malformed or truncated digest is a storage problem, not a successful sign-in. Returning
      // false keeps the failure indistinguishable from a wrong password.
      return false;
    }
  }

  async verifyDummy(password: string): Promise<void> {
    this.#dummyHash ??= this.hash('no-account-matched-this-email');
    await this.verify(await this.#dummyHash, password);
  }
}
