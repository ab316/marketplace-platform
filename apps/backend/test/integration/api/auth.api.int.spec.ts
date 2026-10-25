import type { CurrentUser, SessionResponse } from '@acme/api-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  PASSWORD,
  type TestApp,
  auth,
  createTestApp,
  errorCodeOf,
  signIn,
  signUp,
} from '../../helpers/test-app.ts';

/** UC-002: sign-up, sign-in, sessions, and password change. */
let testApp: TestApp;

beforeEach(async () => {
  testApp = await createTestApp();
});

afterEach(async () => {
  await testApp.close();
});

describe('POST /api/auth/sign-up', () => {
  it('creates an active account with no organization', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/sign-up',
      payload: { email: 'new@buyer.example', password: PASSWORD, displayName: 'New Buyer' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json<CurrentUser>()).toMatchObject({
      email: 'new@buyer.example',
      displayName: 'New Buyer',
      isPlatformAdmin: false,
      membership: null,
    });
  });

  it('never returns the password or its digest', async () => {
    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/sign-up',
      payload: { email: 'new@buyer.example', password: PASSWORD, displayName: 'New Buyer' },
    });

    expect(response.body).not.toContain(PASSWORD);
    expect(response.body.toLowerCase()).not.toContain('hash');
  });

  it('treats the email as case-insensitive and rejects a duplicate', async () => {
    await signUp(testApp, 'dup@buyer.example');

    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/sign-up',
      payload: { email: 'DUP@Buyer.Example', password: PASSWORD, displayName: 'Impostor' },
    });

    expect(response.statusCode).toBe(400);
    expect(errorCodeOf(response)).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects a malformed email and a too-short password', async () => {
    const badEmail = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/sign-up',
      payload: { email: 'not-an-email', password: PASSWORD, displayName: 'X' },
    });
    const shortPassword = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/sign-up',
      payload: { email: 'ok@buyer.example', password: 'short', displayName: 'X' },
    });

    expect(badEmail.statusCode).toBe(400);
    expect(shortPassword.statusCode).toBe(400);
  });
});

describe('POST /api/auth/sign-in', () => {
  it('returns a session token and the current user', async () => {
    await signUp(testApp, 'alice@buyer.example', 'Alice');

    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      payload: { email: 'alice@buyer.example', password: PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    const session = response.json<SessionResponse>();
    expect(session.token).toBeTruthy();
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(testApp.clock.now().getTime());
    expect(session.user).toMatchObject({ email: 'alice@buyer.example', membership: null });
  });

  /**
   * The anti-enumeration guarantee from UC-002 E2: an attacker must not be able to tell a
   * registered address from an unregistered one by the response.
   */
  it('answers identically for an unknown email and a wrong password', async () => {
    await signUp(testApp, 'alice@buyer.example');

    const unknownEmail = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      payload: { email: 'nobody@buyer.example', password: PASSWORD },
    });
    const wrongPassword = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      payload: { email: 'alice@buyer.example', password: 'definitely-wrong-password' },
    });

    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.body).toBe(wrongPassword.body);
    expect(errorCodeOf(unknownEmail)).toBe('INVALID_CREDENTIALS');
  });

  it('issues a different token for each sign-in', async () => {
    await signUp(testApp, 'alice@buyer.example');

    const first = await signIn(testApp, 'alice@buyer.example');
    const second = await signIn(testApp, 'alice@buyer.example');

    expect(first).not.toBe(second);
  });
});

describe('session handling', () => {
  it('rejects a request with no token, a malformed token, or an unknown token', async () => {
    const none = await testApp.server.inject({ method: 'GET', url: '/api/auth/me' });
    const malformed = await testApp.server.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Basic abc' },
    });
    const unknown = await testApp.server.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: auth('not-a-real-token'),
    });

    expect([none, malformed, unknown].map((response) => response.statusCode)).toEqual([
      401, 401, 401,
    ]);
    expect([none, malformed, unknown].map(errorCodeOf)).toEqual([
      'AUTHENTICATION_REQUIRED',
      'AUTHENTICATION_REQUIRED',
      'AUTHENTICATION_REQUIRED',
    ]);
  });

  it('stops accepting a token after sign-out', async () => {
    const alice = await signUp(testApp, 'alice@buyer.example');

    const signedOut = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: auth(alice.token),
    });
    expect(signedOut.statusCode).toBe(204);

    const afterwards = await testApp.server.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: auth(alice.token),
    });
    expect(afterwards.statusCode).toBe(401);
  });

  it('stops accepting a token once the session has expired', async () => {
    const alice = await signUp(testApp, 'alice@buyer.example');

    // The configured session lifetime in tests is seven days.
    testApp.clock.advanceHours(24 * 8);

    const response = await testApp.server.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: auth(alice.token),
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/auth/password', () => {
  it('revokes every existing session when the password changes', async () => {
    const alice = await signUp(testApp, 'alice@buyer.example');
    const secondDevice = await signIn(testApp, 'alice@buyer.example');

    const changed = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: auth(alice.token),
      payload: { currentPassword: PASSWORD, newPassword: 'a-brand-new-password' },
    });
    expect(changed.statusCode).toBe(204);

    const reuseAttempts = await Promise.all(
      [alice.token, secondDevice].map((token) =>
        testApp.server.inject({ method: 'GET', url: '/api/auth/me', headers: auth(token) })
      )
    );
    expect(reuseAttempts.map((response) => response.statusCode)).toEqual([401, 401]);

    // The new password works, the old one does not.
    await expect(
      signIn(testApp, 'alice@buyer.example', 'a-brand-new-password')
    ).resolves.toBeTruthy();
    await expect(signIn(testApp, 'alice@buyer.example', PASSWORD)).rejects.toThrow(
      /Failed to sign in/
    );
  });

  it('refuses the change when the current password is wrong', async () => {
    const alice = await signUp(testApp, 'alice@buyer.example');

    const response = await testApp.server.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: auth(alice.token),
      payload: { currentPassword: 'not-the-current-one', newPassword: 'a-brand-new-password' },
    });

    expect(response.statusCode).toBe(401);
    expect(errorCodeOf(response)).toBe('INVALID_CREDENTIALS');

    // The original session still works, because nothing changed.
    const stillValid = await testApp.server.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: auth(alice.token),
    });
    expect(stillValid.statusCode).toBe(200);
  });
});
