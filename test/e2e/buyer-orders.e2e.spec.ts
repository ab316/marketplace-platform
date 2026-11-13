import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * UC-001, UC-013, UC-014 through the real product: a buyer signs up, confirms an order, follows
 * it, cancels it, and finds it again — browser → Next.js → Fastify → Postgres.
 *
 * Requires the backend (see this directory's README). The test seeds its own seller and listing
 * with a unique marker, so it is repeatable against a database that keeps its data. Per-state
 * rendering is owned by the component suites in `apps/web`; this journey proves what only the
 * real stack can: the confirmation places exactly one real order, the page lands on it, the
 * cancel returns the unit, and the list serves the same record.
 */
// oxlint-disable-next-line node/no-process-env -- several worktrees run their own stacks
const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:4000';
const MARKER = `E2E${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const SELLER_NAME = `E2E Order Refurb ${MARKER}`;
const LISTING_TITLE = `${MARKER} ThinkPad to order`;
const PASSWORD = 'a-long-enough-password';

const stringField = (body: unknown, key: string): string => {
  const value: unknown =
    body !== null && typeof body === 'object' ? Reflect.get(body, key) : undefined;
  if (typeof value !== 'string') {
    throw new Error(`Expected a string "${key}" in ${JSON.stringify(body)}`);
  }
  return value;
};

const seedListing = async (api: APIRequestContext): Promise<void> => {
  const email = `seller.orders.${MARKER.toLowerCase()}@example.com`;
  const signedUp = await api.post(`${API_URL}/api/auth/sign-up`, {
    data: { email, password: PASSWORD, displayName: 'E2E Order Seller' },
  });
  expect(signedUp.status(), await signedUp.text()).toBe(201);

  const signedIn = await api.post(`${API_URL}/api/auth/sign-in`, {
    data: { email, password: PASSWORD },
  });
  expect(signedIn.status()).toBe(200);
  const token = stringField(await signedIn.json(), 'token');

  const organization = await api.post(`${API_URL}/api/organizations`, {
    headers: { authorization: `Bearer ${token}` },
    data: { name: SELLER_NAME },
  });
  expect(organization.status(), await organization.text()).toBe(201);

  const created = await api.post(`${API_URL}/api/listings`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      title: LISTING_TITLE,
      description: 'Seeded by the buyer ordering E2E journey.',
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
        grade: 'A',
        guarantees: { batteryHealthMinPercent: 90 },
        knownDefects: 'none',
      },
      priceMinor: 749_000,
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
};

test.beforeAll(async ({ request }) => {
  await seedListing(request);
});

test('a buyer confirms an order, follows it, cancels it, and finds it again', async ({ page }) => {
  // A fresh buyer account, created through the product itself.
  await page.goto('/sign-up');
  await page.getByLabel('Display name').fill('E2E Order Buyer');
  await page.getByLabel('Email').fill(`buyer.orders.${MARKER.toLowerCase()}@example.com`);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /create account|sign up/i }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  // Find the listing and choose to order it (UC-001 preconditions and B3).
  await page.goto(`/listings?q=${MARKER}`);
  await page.getByRole('link', { name: LISTING_TITLE }).click();
  await page.getByRole('link', { name: 'Order this laptop' }).click();

  // The explicit confirmation (D2): price, no money now, the 24-hour hold.
  await expect(page.getByRole('heading', { name: 'Confirm your order' })).toBeVisible();
  await expect(page.getByText(/no money is taken now/i)).toBeVisible();
  await page.getByRole('button', { name: 'Place order — pay later' }).click();

  // The fresh order page is the confirmation (UC-001 B7): status, expiry, seller, timeline —
  // and no payment affordance yet (D6).
  await expect(page).toHaveURL(/\/orders\/ord_/);
  await expect(page.getByText('Awaiting payment').first()).toBeVisible();
  await expect(page.getByText(/Held for you until/)).toBeVisible();
  await expect(page.getByText(SELLER_NAME)).toBeVisible();
  await expect(page.getByText('Order created')).toBeVisible();
  await expect(page.getByRole('button', { name: /^pay/i })).toHaveCount(0);

  // Cancelling is final and confirmed first (UC-013 C1); the page re-renders cancelled (C5).
  await page.getByRole('button', { name: 'Cancel this order' }).click();
  await page.getByRole('button', { name: 'Cancel the order' }).click();
  await expect(page.getByText('Cancelled').first()).toBeVisible();
  await expect(page.getByText('Order cancelled')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel this order' })).toHaveCount(0);

  // The unit went straight back on sale (UC-013 C3): the listing is orderable again.
  await page.getByRole('link', { name: 'View the listing' }).click();
  await expect(page.getByText('In stock')).toBeVisible();

  // The buyer finds the order again without a link (UC-014 O1).
  await page.getByRole('link', { name: 'Your orders' }).click();
  await expect(page).toHaveURL(/\/orders/);
  await expect(page.getByRole('link', { name: LISTING_TITLE, exact: true })).toBeVisible();
  await expect(page.getByText('Cancelled by you')).toBeVisible();
});
