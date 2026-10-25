import { createHash, randomBytes } from 'node:crypto';

import type { SessionTokenFactory } from '../../application/ports.ts';

const TOKEN_BYTES = 32;

/**
 * Opaque session tokens (ADR-008).
 *
 * The token is 256 bits of CSPRNG output, so it carries no structure to attack and cannot be
 * forged. Only its SHA-256 digest is stored: tokens are high-entropy random values rather than
 * user-chosen secrets, so a fast hash is the right choice here — unlike passwords, there is
 * nothing to brute-force — and a leaked database still yields no usable session.
 */
export class RandomSessionTokenFactory implements SessionTokenFactory {
  create(): { token: string; tokenHash: string } {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
