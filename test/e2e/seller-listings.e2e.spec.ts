import { type Page, expect, test } from '@playwright/test';

/**
 * Seller listing management through the real product (UC-005, UC-007–UC-010; design contract
 * docs/design/seller-listing-management.md): browser → Next.js Server Actions → Fastify →
 * persistence. A new seller saves a half-finished draft, finishes it later, publishes it, sees it
 * in the buyer catalogue, then archives it and it leaves the catalogue.
 *
 * Requires the backend (see this directory's README). Each run registers a unique account and a
 * uniquely titled listing, so it is repeatable against a database that keeps its data.
 */
const stamp = `${Date.now()}${process.pid}`;
const title = `E2E ThinkPad ${stamp}`;

const fill = async (page: Page, label: string | RegExp, value: string) => {
  await page.getByLabel(label, { exact: typeof label === 'string' }).fill(value);
};

test('a seller drafts, publishes, and archives a listing', async ({ page }) => {
  // Fresh seller with an organization (UC-002, UC-003).
  await page.goto('/sign-up');
  await page.getByLabel('Display name').fill('E2E Lister');
  await page.getByLabel('Email').fill(`e2e.lister.${stamp}@example.com`);
  await page.getByLabel('Password').fill('a-long-enough-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/seller/setup');
  await page.getByLabel('Organization name').fill(`E2E Listings ${stamp}`);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page).toHaveURL(/\/seller$/);

  // From the seller home to an empty list (UC-010).
  await page.getByRole('link', { name: 'Your listings' }).click();
  await expect(page).toHaveURL(/\/seller\/listings$/);
  await expect(page.getByText('No listings yet')).toBeVisible();
  await page.getByRole('link', { name: 'New listing' }).click();

  // A half-finished draft saves (UC-005, P1-012).
  await fill(page, 'Title', title);
  await fill(page, 'Price', '7990');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page).toHaveURL(/\/seller\/listings\/[^/]+\?notice=created$/);
  const listingUrl = page.url().replace(/\?.*$/, '');
  await expect(page.getByRole('heading', { name: '13 details missing' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();

  // It shows in the list as a draft with what is missing.
  await page
    .getByRole('navigation', { name: 'Seller' })
    .getByRole('link', { name: 'Listings' })
    .click();
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row.getByText('Draft')).toBeVisible();
  await expect(row.getByText('13 details missing')).toBeVisible();

  // Coming back later, the seller completes it (UC-007).
  await row.getByRole('link', { name: title }).click();
  await fill(page, 'Description', 'Business laptop, refurbished and tested.');
  await page.getByLabel('Brand').selectOption('Lenovo');
  await fill(page, 'Model', 'ThinkPad T14 Gen 3');
  await fill(page, 'CPU', 'Intel Core i5-1245U');
  await fill(page, 'RAM', '16');
  await page.getByLabel('Storage type').selectOption('nvme');
  await fill(page, 'Storage', '512');
  await fill(page, 'Screen size', '14');
  await page.getByLabel(/Grade A/).check();
  await fill(page, 'Battery health floor', '90');
  await fill(page, 'Known defects', 'none');
  await fill(page, 'Quantity', '2');
  await fill(page, 'Fulfillment expectations', 'Shipped within 2 business days.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText(/^Saved at /)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ready to publish' })).toBeVisible();

  // Publish, after confirming (UC-008).
  await page.getByRole('button', { name: 'Publish' }).click();
  const publishDialog = page.getByRole('alertdialog', { name: 'Publish this listing?' });
  await publishDialog.getByRole('button', { name: 'Publish' }).click();
  await expect(page).toHaveURL(`${listingUrl}?notice=published`);
  await expect(page.getByText('Your listing is live.')).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();

  // Buyers find it in the catalogue (UC-006).
  await page.goto(`/listings?q=${encodeURIComponent(stamp)}`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  // Archive, after confirming (UC-009): it leaves the catalogue, stays in the seller's list.
  await page.goto(listingUrl);
  await page.getByRole('button', { name: 'Archive listing' }).click();
  await page
    .getByRole('alertdialog', { name: 'Archive this listing?' })
    .getByRole('button', { name: 'Archive' })
    .click();
  await expect(page).toHaveURL(`${listingUrl}?notice=archived`);
  await expect(page.getByText('Archived', { exact: true })).toBeVisible();

  await page.goto(`/listings?q=${encodeURIComponent(stamp)}`);
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0);
  await page.goto('/seller/listings');
  await expect(
    page.getByRole('row').filter({ hasText: title }).getByText('Archived', { exact: true })
  ).toBeVisible();
});
