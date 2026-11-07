import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * UC-006 through the real product: browser → Next.js Server Component → Fastify → Postgres.
 *
 * Requires the backend (see this directory's README). The test seeds its own seller and listings
 * through the backend API with a unique marker in every title, and keeps that marker as the
 * keyword in each search, so the journey is repeatable against a database that keeps its data
 * and immune to whatever else the catalogue holds.
 *
 * Deliberately not covered here: every filter/sort permutation (owned by
 * `apps/backend/test/integration/api/catalogue-search.api.int.spec.ts`) and per-state rendering
 * (owned by the component suite in `apps/web`).
 */
// The backend's default local port; this suite requires it running (see README).
// The suite must target whichever stack is running: several worktrees of this repo each run
// their own backend on their own port.
// oxlint-disable-next-line node/no-process-env -- see above
const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:4000';
const MARKER = `E2E${Date.now()}${Math.floor(Math.random() * 10_000)}`;

/** Narrows a JSON body without asserting away `any`. */
const stringField = (body: unknown, key: string): string => {
  const value: unknown =
    body !== null && typeof body === 'object' ? Reflect.get(body, key) : undefined;
  if (typeof value !== 'string') {
    throw new Error(`Expected a string "${key}" in ${JSON.stringify(body)}`);
  }
  return value;
};

const seedListing = async (
  api: APIRequestContext,
  token: string,
  listing: {
    title: string;
    brand: string;
    model: string;
    ramGb: number;
    grade: 'A' | 'B' | 'C';
    priceMinor: number;
  }
) => {
  const created = await api.post(`${API_URL}/api/listings`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      title: listing.title,
      description: 'Seeded by the catalogue E2E journey.',
      specifications: {
        brand: listing.brand,
        model: listing.model,
        cpu: 'Core i5-1245U',
        ramGb: listing.ramGb,
        storageType: 'nvme',
        storageGb: 512,
        screenSizeInches: 14,
      },
      condition: {
        grade: listing.grade,
        guarantees: { batteryHealthMinPercent: 85 },
        knownDefects: 'none',
      },
      priceMinor: listing.priceMinor,
      currency: 'SEK',
      quantityTotal: 2,
      fulfillmentExpectations: 'Ships in 2 business days.',
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = stringField(await created.json(), 'id');

  const published = await api.post(`${API_URL}/api/listings/${id}/publish`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(published.status(), await published.text()).toBe(200);
};

test.beforeAll(async ({ request }) => {
  const email = `seller.${MARKER.toLowerCase()}@example.com`;
  const signedUp = await request.post(`${API_URL}/api/auth/sign-up`, {
    data: { email, password: 'a-long-enough-password', displayName: 'E2E Seller' },
  });
  expect(signedUp.status(), await signedUp.text()).toBe(201);

  const signedIn = await request.post(`${API_URL}/api/auth/sign-in`, {
    data: { email, password: 'a-long-enough-password' },
  });
  expect(signedIn.status()).toBe(200);
  const token = stringField(await signedIn.json(), 'token');

  const organization = await request.post(`${API_URL}/api/organizations`, {
    headers: { authorization: `Bearer ${token}` },
    data: { name: `E2E Refurb ${MARKER}` },
  });
  expect(organization.status(), await organization.text()).toBe(201);

  await seedListing(request, token, {
    title: `${MARKER} ThinkPad budget`,
    brand: 'Lenovo',
    model: 'ThinkPad E15',
    ramGb: 8,
    grade: 'C',
    priceMinor: 300_000,
  });
  await seedListing(request, token, {
    title: `${MARKER} ThinkPad executive`,
    brand: 'Lenovo',
    model: 'ThinkPad X1',
    ramGb: 32,
    grade: 'A',
    priceMinor: 1_100_000,
  });
  await seedListing(request, token, {
    title: `${MARKER} MacBook`,
    brand: 'Apple',
    model: 'MacBook Air M2',
    ramGb: 16,
    grade: 'B',
    priceMinor: 900_000,
  });
});

test('a buyer refines the catalogue, recovers from zero results, and shares the search', async ({
  page,
}) => {
  // Anonymous browsing straight from the header (UC-001 preconditions).
  await page.goto('/');
  // Scoped to the header: the home hero carries its own "Browse laptops" CTA to the same place.
  await page.locator('header').getByRole('link', { name: 'Browse laptops' }).click();
  await expect(page).toHaveURL(/\/listings$/);
  await expect(page.getByRole('heading', { name: 'Refurbished laptops' })).toBeVisible();

  // Keyword narrows to this run's three seeded listings.
  await page.getByLabel('Search laptops').fill(MARKER);
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByText('3 laptops')).toBeVisible();

  // Brand + memory filters combine conjunctively (UC-006 B2/B4).
  await page.getByRole('checkbox', { name: 'Lenovo' }).check();
  await page.getByLabel('Minimum price in SEK').fill('5000');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByText('1 laptop', { exact: true })).toBeVisible();
  await expect(page.getByText(`${MARKER} ThinkPad executive`)).toBeVisible();
  await expect(page).toHaveURL(/brand=Lenovo/);

  // Removing one refinement by chip keeps the rest (B5).
  await page.getByRole('link', { name: 'Remove filter: min price' }).click();
  await expect(page.getByText('2 laptops')).toBeVisible();

  // Explicit sort orders by price and survives as URL state (B3, B6).
  await page.getByLabel('Sort').selectOption('price_asc');
  await expect(page).toHaveURL(/sort=price_asc/);
  const cardHeadings = page.getByRole('heading', { level: 3 });
  await expect(cardHeadings.first()).toHaveText(`${MARKER} ThinkPad budget`);

  // The shared link restores the whole search (B6).
  const sharedUrl = page.url();
  await page.goto('about:blank');
  await page.goto(sharedUrl);
  await expect(page.getByRole('checkbox', { name: 'Lenovo' })).toBeChecked();
  await expect(page.getByText('2 laptops')).toBeVisible();

  // A search that matches nothing explains itself and recovers in one action (A1).
  await page.getByLabel('Maximum price in SEK').fill('1');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByText('Nothing matches your search')).toBeVisible();
  await page.getByRole('link', { name: 'Clear all filters' }).click();
  await expect(page.getByRole('heading', { name: 'Refurbished laptops' })).toBeVisible();
  await expect(page.getByText('Nothing matches your search')).not.toBeVisible();
});
