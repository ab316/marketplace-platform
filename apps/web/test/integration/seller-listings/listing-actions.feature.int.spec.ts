import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BACKEND_URL } from '../../msw/handlers.ts';
import { activeListing, emptyDraft, readyDraft } from '../../msw/listing-fixtures.ts';
import { server } from '../../msw/server.ts';

/**
 * Integration tests for the seller-listing Server Actions (UC-005, UC-007–UC-009 over the web):
 * the real actions, data layer, and contract schemas, with the backend simulated at the HTTP
 * boundary. Owns the design contract's error mapping. `next/*` request-scope modules are
 * substituted, exactly like the create-organization suite.
 */

const cookieJar = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieJar.store.get(name);
        return value === undefined ? undefined : { name, value };
      },
    }),
}));

const redirected = vi.hoisted(() => ({ location: undefined as string | undefined }));
const revalidated = vi.hoisted(() => ({ paths: [] as string[] }));

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => {
    revalidated.paths.push(path);
  },
}));

vi.mock('next/navigation', () => ({
  redirect: (location: string): never => {
    redirected.location = location;
    throw new Error(`NEXT_REDIRECT:${location}`);
  },
}));

const {
  archiveListingAction,
  createListingDraftAction,
  publishListingAction,
  saveListingDraftAction,
} = await import('../../../src/features/seller-listings/actions.ts');

const errorBody = (code: string, message: string, details?: Record<string, unknown>) => ({
  error: { code, message, ...(details === undefined ? {} : { details }) },
});

const expectRedirect = async (run: () => Promise<unknown>): Promise<string | undefined> => {
  redirected.location = undefined;
  await expect(run()).rejects.toThrow(/NEXT_REDIRECT/);
  return redirected.location;
};

beforeEach(() => {
  cookieJar.store.clear();
  cookieJar.store.set('marketplace_session', 'opaque-token-123');
  redirected.location = undefined;
  revalidated.paths.length = 0;
});

describe('createListingDraftAction (UC-005)', () => {
  it('posts the incomplete draft with the session and opens it at its own URL', async () => {
    let received: { body: unknown; authorization: string | null } | undefined;
    server.use(
      http.post(`${BACKEND_URL}/api/listings`, async ({ request }) => {
        received = {
          body: await request.json(),
          authorization: request.headers.get('authorization'),
        };
        return HttpResponse.json(emptyDraft({ id: 'lst_new', title: 'Half done' }), {
          status: 201,
        });
      })
    );

    const location = await expectRedirect(() =>
      createListingDraftAction({ title: 'Half done', priceMinor: null })
    );

    expect(location).toBe('/seller/listings/lst_new?notice=created');
    expect(received).toEqual({
      body: { title: 'Half done', priceMinor: null },
      authorization: 'Bearer opaque-token-123',
    });
    expect(revalidated.paths).toContain('/seller/listings');
  });

  it('refuses an off-list brand before calling the backend', async () => {
    const result = await createListingDraftAction({ specifications: { brand: 'Commodore' } });

    expect(result.fieldErrors).toEqual({
      'specifications.brand': 'Choose a brand from the marketplace list.',
    });
  });
});

describe('saveListingDraftAction (UC-007)', () => {
  it('patches the whole form and returns the fresh draft', async () => {
    let body: unknown;
    server.use(
      http.patch(`${BACKEND_URL}/api/listings/lst_draft`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(readyDraft());
      })
    );

    const result = await saveListingDraftAction('lst_draft', {
      title: 'ThinkPad',
      description: null,
    });

    expect(body).toEqual({ title: 'ThinkPad', description: null });
    expect(result).toEqual({ ok: true, draft: readyDraft() });
  });

  it('maps backend issues onto form fields, price included', async () => {
    server.use(
      http.patch(`${BACKEND_URL}/api/listings/lst_draft`, () =>
        HttpResponse.json(
          errorBody('INVALID_LISTING_DATA', 'Price must be greater than zero.', {
            issues: [
              { path: 'priceMinor', message: 'Price must be greater than zero.' },
              {
                path: 'condition.guarantees.batteryCycleMin',
                message: 'Battery cycle range is inverted.',
              },
            ],
          }),
          { status: 400 }
        )
      )
    );

    const result = await saveListingDraftAction('lst_draft', { priceMinor: 1 });

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        priceKronor: 'Price must be greater than zero.',
        'condition.guarantees.batteryCycleMin': 'Battery cycle range is inverted.',
      },
    });
  });

  it.each([
    ['LISTING_STATE_CONFLICT', 409, { ok: false, blocked: 'published' }],
    ['ORGANIZATION_ACCESS_DENIED', 403, { ok: false, blocked: 'forbidden' }],
    ['ORGANIZATION_STATE_CONFLICT', 409, { ok: false, blocked: 'forbidden' }],
    [
      'LISTING_CONCURRENCY_CONFLICT',
      409,
      {
        ok: false,
        formError: 'Someone saved this draft at the same moment. Save again to keep your changes.',
      },
    ],
  ])('maps %s to the editor state the design names', async (code, status, expected) => {
    server.use(
      http.patch(`${BACKEND_URL}/api/listings/lst_draft`, () =>
        HttpResponse.json(errorBody(code, 'Refused.'), { status })
      )
    );

    expect(await saveListingDraftAction('lst_draft', { title: 'x' })).toEqual(expected);
  });

  it('sends a dead session back to sign-in with the listing as next', async () => {
    server.use(
      http.patch(`${BACKEND_URL}/api/listings/lst_draft`, () =>
        HttpResponse.json(errorBody('AUTHENTICATION_REQUIRED', 'Sign in.'), { status: 401 })
      )
    );

    const location = await expectRedirect(() =>
      saveListingDraftAction('lst_draft', { title: 'x' })
    );

    expect(location).toBe(`/sign-in?next=${encodeURIComponent('/seller/listings/lst_draft')}`);
  });
});

describe('publishListingAction (UC-008)', () => {
  it('publishes and re-renders the same URL as the live listing', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_draft/publish`, () =>
        HttpResponse.json(activeListing({ id: 'lst_draft' }))
      )
    );

    const location = await expectRedirect(() => publishListingAction('lst_draft'));

    expect(location).toBe('/seller/listings/lst_draft?notice=published');
    expect(revalidated.paths).toEqual(
      expect.arrayContaining(['/seller/listings', '/seller/listings/lst_draft', '/listings'])
    );
  });

  it('returns every issue when the draft turns out to be incomplete', async () => {
    const issues = [
      { path: 'title', message: 'Required to publish.' },
      { path: 'specifications.brand', message: 'Choose a brand from the marketplace list.' },
    ];
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_draft/publish`, () =>
        HttpResponse.json(
          errorBody('LISTING_INCOMPLETE', 'Not ready.', { listingId: 'lst_draft', issues }),
          {
            status: 400,
          }
        )
      )
    );

    expect(await publishListingAction('lst_draft')).toEqual({ issues });
  });

  it('reloads into the real state when the listing was already published', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_draft/publish`, () =>
        HttpResponse.json(errorBody('LISTING_STATE_CONFLICT', 'Only a draft.'), { status: 409 })
      )
    );

    expect(await expectRedirect(() => publishListingAction('lst_draft'))).toBe(
      '/seller/listings/lst_draft?notice=already-published'
    );
  });
});

describe('archiveListingAction (UC-009)', () => {
  it('archives and re-renders the listing', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_active/archive`, () =>
        HttpResponse.json(
          activeListing({ status: 'archived', archivedAt: '2026-11-07T10:00:00.000Z' })
        )
      )
    );

    expect(await expectRedirect(() => archiveListingAction('lst_active'))).toBe(
      '/seller/listings/lst_active?notice=archived'
    );
  });

  it('reloads with a notice when it was already archived', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_active/archive`, () =>
        HttpResponse.json(errorBody('LISTING_STATE_CONFLICT', 'Only active.'), { status: 409 })
      )
    );

    expect(await expectRedirect(() => archiveListingAction('lst_active'))).toBe(
      '/seller/listings/lst_active?notice=already-archived'
    );
  });

  it('shows the generic banner when the backend is unreachable', async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/listings/lst_active/archive`, () => HttpResponse.error())
    );

    expect(await archiveListingAction('lst_active')).toEqual({
      formError: 'Something went wrong. Please try again.',
    });
  });
});
