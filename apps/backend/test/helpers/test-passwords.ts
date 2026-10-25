import { createHash } from 'node:crypto';

import type { PasswordHasher } from '../../src/modules/identity/application/ports.ts';

/**
 * A deliberately cheap stand-in for Argon2id in tests.
 *
 * Argon2id is slow by design, and a suite that signs in dozens of times would spend most of its
 * runtime deriving keys. This keeps the *semantics* the application depends on — a digest that
 * verifies only against its own password, and a safe answer for a malformed digest — while
 * costing nothing. The real hasher is covered directly by
 * `test/unit/identity/password-hashing.unit.spec.ts`, so swapping it here never hides a defect
 * in the production implementation.
 */
export class TestPasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return Promise.resolve(`sha256:${createHash('sha256').update(password).digest('hex')}`);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    return passwordHash === (await this.hash(password));
  }

  async verifyDummy(password: string): Promise<void> {
    await this.hash(password);
  }
}
