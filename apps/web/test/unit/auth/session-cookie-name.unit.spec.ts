// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The session cookie's name is configuration (`SESSION_COOKIE_NAME`), so that several local
 * stacks on `localhost` — one per git worktree — keep separate sessions: browsers scope cookies by
 * host, not port. Production uses the default. `serverEnv()` caches its first read, so every test
 * loads the modules afresh after stubbing the environment.
 */

const jar = vi.hoisted(() => new Map<string, string>());

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
      set: (name: string, value: string) => jar.set(name, value),
      delete: (name: string) => jar.delete(name),
    }),
}));

const loadEnv = async () => import('../../../src/lib/env.ts');
const loadProxy = async () => (await import('../../../src/proxy.ts')).default;

const requestTo = (path: string, cookie?: string): NextRequest =>
  new NextRequest(`http://localhost:4001${path}`, {
    headers: cookie === undefined ? {} : { cookie },
  });

beforeEach(() => {
  vi.resetModules();
  jar.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('session cookie name', () => {
  it('defaults to marketplace_session', async () => {
    vi.stubEnv('SESSION_COOKIE_NAME', undefined);
    const { sessionCookieName } = await loadEnv();
    expect(sessionCookieName()).toBe('marketplace_session');
  });

  it('uses the configured name', async () => {
    vi.stubEnv('SESSION_COOKIE_NAME', 'marketplace_session_oak');
    const { sessionCookieName } = await loadEnv();
    expect(sessionCookieName()).toBe('marketplace_session_oak');
  });

  it.each([
    ['a separator', 'marketplace;session'],
    ['whitespace', 'marketplace session'],
    ['an empty value', ''],
    ['a reserved cookie prefix', '__Host_session'],
    ['more than 64 characters', 'a'.repeat(65)],
  ])('refuses a name with %s', async (_, name) => {
    vi.stubEnv('SESSION_COOKIE_NAME', name);
    const { serverEnv } = await loadEnv();
    expect(() => serverEnv()).toThrow(/SESSION_COOKIE_NAME/);
  });
});

describe('proxy with a configured cookie name', () => {
  it('lets a protected request through when the configured cookie is present', async () => {
    vi.stubEnv('SESSION_COOKIE_NAME', 'marketplace_session_oak');
    const proxy = await loadProxy();

    const response = proxy(requestTo('/seller', 'marketplace_session_oak=token'));

    expect(response.headers.get('location')).toBeNull();
  });

  it("ignores another stack's cookie and sends the visitor to sign in", async () => {
    vi.stubEnv('SESSION_COOKIE_NAME', 'marketplace_session_oak');
    const proxy = await loadProxy();

    const response = proxy(requestTo('/seller', 'marketplace_session=token-from-elsewhere'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:4001/sign-in?next=%2Fseller');
  });
});

describe('session cookie helpers with a configured name', () => {
  it("write, read, and clear this stack's cookie and leave another stack's alone", async () => {
    vi.stubEnv('SESSION_COOKIE_NAME', 'marketplace_session_oak');
    const session = await import('../../../src/lib/auth/session-cookie.ts');
    jar.set('marketplace_session', 'token-from-elsewhere');

    await session.writeSessionToken('opaque-token', new Date('2030-01-01T00:00:00Z'));
    expect(jar.get('marketplace_session_oak')).toBe('opaque-token');
    expect(await session.readSessionToken()).toBe('opaque-token');

    await session.clearSessionToken();
    expect(jar.has('marketplace_session_oak')).toBe(false);
    expect(jar.get('marketplace_session')).toBe('token-from-elsewhere');
  });
});
