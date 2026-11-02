import { type Page, expect, test } from '@playwright/test';

/**
 * UC-007 and UC-008 through the real product: browser → Next.js Server Actions → Fastify →
 * persistence (design contract: docs/design/seller-listing-management.md).
 *
 * One seller goes from an empty organization to a listing a buyer can find, then withdraws it:
 * sign up → create the organization → empty list → create a draft → publish → find it in the
 * public catalogue by keyword → archive (dialog: cancel, then confirm) → gone from the catalogue,
 * still in the seller list as Archived.
 *
 * Requires the backend to be running (see this directory's README). Each run registers a unique
 * account and a unique model name, so the journey is repeatable against a database that keeps
 * its rows.
 */

const stamp = `${Date.now()}${process.pid}`;
const email = `e2e.lister.${stamp}@example.com`;
const password = 'a-long-enough-password';
const orgName = `E2E Listers ${stamp}`;
const model = `ThinkPad E2E ${stamp}`;
const title = `${model} — journey laptop`;

const signUpAndCreateOrganization = async (page: Page) => {
  await page.goto('/sign-up');
  await page.getByLabel('Display name').fill('E2E Lister');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/seller/setup');
  await page.getByLabel('Organization name').fill(orgName);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page).toHaveURL(/\/seller$/);
};

test.describe('a seller publishes a listing and later withdraws it', () => {
  test('draft → publish → found by a buyer → archive', async ({ page }) => {
    await signUpAndCreateOrganization(page);

    // The seller sub-navigation leads to an empty list that points at the first draft.
    await page
      .getByRole('navigation', { name: 'Seller' })
      .getByRole('link', { name: 'Listings' })
      .click();
    await expect(page).toHaveURL(/\/seller\/listings$/);
    await expect(page.getByText('No listings yet')).toBeVisible();
    await page.getByRole('link', { name: 'Create your first listing' }).click();
    await expect(page).toHaveURL(/\/seller\/listings\/new$/);

    // Every field is required to save (UC-007 Gaps): an empty submit stays on the page.
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Description').fill('Journey laptops for the E2E suite.');
    await page.getByLabel('Brand').fill('Lenovo');
    await page.getByLabel('Model').fill(model);
    await page.getByLabel('Processor').fill('AMD Ryzen 5 PRO 6650U');
    await page.getByLabel('Memory (GB)').fill('16');
    await page.getByLabel('Storage type').selectOption('nvme');
    await page.getByLabel('Storage (GB)').fill('256');
    await page.getByLabel('Screen size (inches)').fill('14');
    await page.getByLabel('Condition grade').selectOption('B');
    await page.getByLabel('Battery health, minimum (%)').fill('85');
    await page.getByLabel('Known defects').fill('none');
    await page.getByLabel('Price (SEK)').fill('7 490');
    await page.getByLabel('Quantity').fill('3');
    await page.getByLabel('Fulfillment expectations').fill('Shipped within 2 working days.');
    await page.getByRole('button', { name: 'Save draft' }).click();

    // Saved as a draft: detail page, not visible to buyers, Publish and Edit on offer.
    // Excludes `/new`: the URL must have moved on to the created listing before it is captured.
    await expect(page).toHaveURL(/\/seller\/listings\/(?!new$)[^/]+$/);
    const detailUrl = page.url();
    const statusCard = page.getByRole('complementary', { name: 'Status and actions' });
    await expect(statusCard.getByText('Draft', { exact: true })).toBeVisible();
    await expect(statusCard.getByText(/Not visible to buyers/)).toBeVisible();
    await expect(page.getByText(/7\s?490\s?kr/).first()).toBeVisible();

    // A buyer cannot find a draft.
    await page.goto(`/listings?q=${encodeURIComponent(model)}`);
    await expect(page.getByText('Nothing matches your search')).toBeVisible();

    // Publish (UC-007 S3/S4).
    await page.goto(detailUrl);
    await statusCard.getByRole('button', { name: 'Publish listing' }).click();
    await expect(statusCard.getByText('Active', { exact: true })).toBeVisible();
    await expect(statusCard.getByRole('button', { name: /Archive listing/ })).toBeVisible();
    await expect(statusCard.getByRole('link', { name: /Edit/ })).toHaveCount(0);

    // Now the buyer finds it in the catalogue (UC-006).
    await page.goto(`/listings?q=${encodeURIComponent(model)}`);
    // Cards are not links yet (#15; the buyer detail slice), so the title is a heading.
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    // Archive: the dialog states the consequences; Cancel sends nothing (UC-008 A1).
    await page.goto(detailUrl);
    await statusCard.getByRole('button', { name: /Archive listing/ }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Archive this listing?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(statusCard.getByText('Active', { exact: true })).toBeVisible();

    // Confirm (UC-008 W2–W4).
    await statusCard.getByRole('button', { name: /Archive listing/ }).click();
    await dialog.getByRole('button', { name: 'Archive listing' }).click();
    await expect(statusCard.getByText('Archived', { exact: true })).toBeVisible();
    await expect(statusCard.getByText(/can.t be re-published/)).toBeVisible();
    await expect(statusCard.getByRole('button')).toHaveCount(0);

    // Gone from the catalogue, still in the seller's list.
    await page.goto(`/listings?q=${encodeURIComponent(model)}`);
    await expect(page.getByText('Nothing matches your search')).toBeVisible();

    await page.goto('/seller/listings');
    const row = page.getByRole('row', { name: new RegExp(title) });
    await expect(row).toBeVisible();
    await expect(row.getByText('Archived')).toBeVisible();
  });

  test('the listing routes are protected', async ({ page }) => {
    await page.goto('/seller/listings');
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });
});
