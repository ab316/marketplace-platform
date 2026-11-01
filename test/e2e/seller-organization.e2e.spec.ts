import { type Page, expect, test } from '@playwright/test';

const header = (page: Page) => page.getByRole('navigation', { name: 'Main' });

/**
 * UC-003 C1–C3 through the real product: browser → Next.js Server Action → Fastify → persistence
 * (design contract: docs/design/seller-organization-setup.md).
 *
 * Requires the backend to be running (see this directory's README). Each run registers a unique
 * account, so the journey is repeatable against a database that keeps its users.
 */
test.describe('a new seller signs up and creates their organization', () => {
  const email = `e2e.seller.${Date.now()}.${process.pid}@example.com`;
  const password = 'a-long-enough-password';
  const orgName = `E2E Refurb ${Date.now()}`;

  test('the protected setup route sends an anonymous visitor through sign-in', async ({ page }) => {
    await page.goto('/seller/setup');
    await expect(page).toHaveURL(
      /\/sign-in\?next=%2Fseller%2Fsetup|\/sign-in\?next=\/seller\/setup/
    );
  });

  test('sign up, start selling, create the organization, land on the seller home', async ({
    page,
  }) => {
    // Fresh account; sign-up signs straight in (UC-002).
    await page.goto('/sign-up');
    await page.getByLabel('Display name').fill('E2E Seller');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/');

    // A signed-in user with no organization gets the path to selling in the header.
    await header(page).getByRole('link', { name: 'Start selling' }).click();
    await expect(page).toHaveURL(/\/seller\/setup$/);

    await page.getByLabel('Organization name').fill(orgName);
    await page.getByLabel('Description').fill('Laptops for the E2E suite');
    await page.getByRole('button', { name: 'Create organization' }).click();

    // The seller home shows the new organization as active, owned by the creator.
    await expect(page).toHaveURL(/\/seller$/);
    await expect(page.getByText(orgName).first()).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await expect(page.getByText('Owner', { exact: true })).toBeVisible();

    // The header now carries the organization identity (membership is read per request).
    await expect(
      header(page).getByRole('link', { name: `Your organization: ${orgName}` })
    ).toBeVisible();

    // The form is never shown to someone who cannot use it: setup now redirects home (UC-003 E1).
    await page.goto('/seller/setup');
    await expect(page).toHaveURL(/\/seller$/);
  });
});
