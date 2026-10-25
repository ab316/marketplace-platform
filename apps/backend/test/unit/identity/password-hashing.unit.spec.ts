import { describe, expect, it } from 'vitest';

import { Argon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2-password-hasher.ts';
import { RandomSessionTokenFactory } from '../../../src/modules/identity/infrastructure/security/random-session-token-factory.ts';

/**
 * The real hasher, not the fast test substitute: API suites swap it out for speed, so this is
 * the one place that proves credentials are actually protected as ADR-008 requires.
 */
describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('produces an Argon2id digest, not another variant', async () => {
    const digest = await hasher.hash('correct-horse-battery');

    expect(digest.startsWith('$argon2id$')).toBe(true);
  });

  it('never stores the password itself', async () => {
    const digest = await hasher.hash('correct-horse-battery');

    expect(digest).not.toContain('correct-horse-battery');
  });

  it('salts every digest, so identical passwords hash differently', async () => {
    const [first, second] = await Promise.all([hasher.hash('same'), hasher.hash('same')]);

    expect(first).not.toBe(second);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const digest = await hasher.hash('correct-horse-battery');

    await expect(hasher.verify(digest, 'correct-horse-battery')).resolves.toBe(true);
    await expect(hasher.verify(digest, 'wrong')).resolves.toBe(false);
  });

  it('treats a corrupt digest as a failed sign-in rather than throwing', async () => {
    await expect(hasher.verify('not-a-digest', 'anything')).resolves.toBe(false);
  });

  it('does comparable work when no account matched', async () => {
    await expect(hasher.verifyDummy('anything')).resolves.toBeUndefined();
  });
});

describe('RandomSessionTokenFactory', () => {
  const factory = new RandomSessionTokenFactory();

  it('issues a distinct high-entropy token each time', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => factory.create().token));

    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      expect(token.length).toBeGreaterThanOrEqual(43);
    }
  });

  it('stores only a digest, from which the token cannot be read', () => {
    const { token, tokenHash } = factory.create();

    expect(tokenHash).not.toBe(token);
    expect(tokenHash).not.toContain(token);
    expect(factory.hash(token)).toBe(tokenHash);
  });
});
