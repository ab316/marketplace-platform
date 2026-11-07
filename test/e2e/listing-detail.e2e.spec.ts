import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * UC-012 through the real product: browser → Next.js Server Component → Fastify → Postgres.
 *
 * Requires the backend (see this directory's README). The test seeds its own seller and listings
 * with a unique marker, so it is repeatable against a database that keeps its data. Per-state
 * rendering is owned by the component suite in `apps/web`; this journey proves the parts only a
 * real stack can: the catalogue card is a link, the page is served to an anonymous visitor with
 * the seller's name on it, and the search survives the detour.
 */
// The suite must target whichever stack is running: several worktrees of this repo each run
// their own backend on their own port.
// oxlint-disable-next-line node/no-process-env -- see above
const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:4000';
const MARKER = `E2E${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const SELLER_NAME = `E2E Detail Refurb ${MARKER}`;
const PASSWORD = 'a-long-enough-password';

/** Narrows a JSON body without asserting away `any`. */
const stringField = (body: unknown, key: string): string => {
  const value: unknown =
    body !== null && typeof body === 'object' ? Reflect.get(body, key) : undefined;
  if (typeof value !== 'string') {
    throw new Error(`Expected a string "${key}" in ${JSON.stringify(body)}`);
  }
  return value;
};

const publishListing = async (
  api: APIRequestContext,
  token: string,
  title: string
): Promise<string> => {
  const created = await api.post(`${API_URL}/api/listings`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      title,
      description: 'Seeded by the listing detail E2E journey.',
      specifications: {
        brand: 'Lenovo',
        model: 'ThinkPad T14',
        cpu: 'Core i5-1245U',
        ramGb: 16,
        storageType: 'nvme',
        storageGb: 512,
        screenSizeInches: 14,
      },
      condition: {
        grade: 'B',
        guarantees: { batteryHealthMinPercent: 88 },
        knownDefects: `Hairline scratch on the lid (${MARKER}).`,
      },
      priceMinor: 649_000,
      currency: 'SEK',
      quantityTotal: 2,
      fulfillmentExpectations: 'Dispatched within 2 business days from Gothenburg.',
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const listingId = stringField(await created.json(), 'id');

  const published = await api.post(`${API_URL}/api/listings/${listingId}/publish`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(published.status(), await published.text()).toBe(200);

  return listingId;
};

let activeListingId = '';
let archivedListingId = '';

test.beforeAll(async ({ request }) => {
  const email = `seller.detail.${MARKER.toLowerCase()}@example.com`;
  const signedUp = await request.post(`${API_URL}/api/auth/sign-up`, {
    data: { email, password: PASSWORD, displayName: 'E2E Detail Seller' },
  });
  expect(signedUp.status(), await signedUp.text()).toBe(201);

  const signedIn = await request.post(`${API_URL}/api/auth/sign-in`, {
    data: { email, password: PASSWORD },
  });
  expect(signedIn.status()).toBe(200);
  const token = stringField(await signedIn.json(), 'token');

  const organization = await request.post(`${API_URL}/api/organizations`, {
    headers: { authorization: `Bearer ${token}` },
    data: { name: SELLER_NAME },
  });
  expect(organization.status(), await organization.text()).toBe(201);

  activeListingId = await publishListing(request, token, `${MARKER} ThinkPad on sale`);
  archivedListingId = await publishListing(request, token, `${MARKER} ThinkPad withdrawn`);

  const archived = await request.post(`${API_URL}/api/listings/${archivedListingId}/archive`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(archived.status(), await archived.text()).toBe(200);
});

test('a buyer opens a result, reads the whole listing, and returns to their search', async ({
  page,
}) => {
  // Anonymous throughout: inspecting a listing requires no account (UC-012 preconditions).
  await page.goto(`/listings?q=${MARKER}`);
  await expect(page.getByText('1 laptop', { exact: true })).toBeVisible();
  await expect(page.getByText(`Sold by ${SELLER_NAME}`)).toBeVisible();

  // The card is one link named by the listing title (issue #15).
  await page.getByRole('link', { name: `${MARKER} ThinkPad on sale` }).click();
  await expect(page).toHaveURL(new RegExp(`/listings/${activeListingId}`));

  await expect(
    page.getByRole('heading', { level: 1, name: `${MARKER} ThinkPad on sale` })
  ).toBeVisible();
  await expect(page.getByText('Lenovo ThinkPad T14')).toBeVisible();
  await expect(page.getByText('Grade B · Light wear')).toBeVisible();
  await expect(page.getByText(`Hairline scratch on the lid (${MARKER}).`)).toBeVisible();
  await expect(page.getByText('Dispatched within 2 business days from Gothenburg.')).toBeVisible();
  await expect(page.getByText('In stock')).toBeVisible();

  // Who is selling, resolved by the backend on a public route (P1-020, UC-012 V5).
  await expect(page.getByRole('region', { name: 'Sold by' }).getByText(SELLER_NAME)).toBeVisible();

  // The detour costs the buyer nothing: the same search comes back (UC-012 V8).
  await page.getByRole('link', { name: 'Back to results' }).click();
  await expect(page).toHaveURL(new RegExp(`/listings\\?q=${MARKER}`));
  await expect(page.getByText('1 laptop', { exact: true })).toBeVisible();
});

test('a withdrawn listing still reads, and an unknown one is simply not available', async ({
  page,
}) => {
  // An archived listing keeps its page so old orders and shared links resolve (UC-012 A2).
  await page.goto(`/listings/${archivedListingId}`);
  await expect(page.getByText('No longer sold')).toBeVisible();
  await expect(page.getByText(`Hairline scratch on the lid (${MARKER}).`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Order this laptop' })).toHaveCount(0);
  // It is gone from the catalogue all the same (UC-006 B1).
  await page.goto(`/listings?q=${MARKER}`);
  await expect(page.getByText(`${MARKER} ThinkPad withdrawn`)).toHaveCount(0);

  // One answer for an unknown id, a draft, and a deactivated seller (UC-012 A5/E1).
  await page.goto('/listings/lst_does_not_exist');
  await expect(page.getByText('This listing is not available')).toBeVisible();
});
