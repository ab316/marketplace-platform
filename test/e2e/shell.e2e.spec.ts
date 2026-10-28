import { expect, test } from '@playwright/test';

/**
 * Smoke coverage for the application shell.
 *
 * This is the one journey that exists before any marketplace feature does: it proves the server
 * renders, the shell is navigable, and the accessibility affordances the design system promises
 * are actually present in the delivered HTML. Real buyer, seller, and operator journeys are
 * added alongside their use cases (UC-001, UC-004, UC-005).
 */
test.describe('application shell', () => {
  test('server-renders the home page with its content in the initial HTML', async ({
    page,
    request,
  }) => {
    // Fetched without a browser, so this fails if the page ever becomes client-rendered —
    // which is what would silently break SEO on the catalogue.
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Refurbished computers');

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Refurbished computers, bought with confidence.'
    );
  });

  test('exposes a working skip link as the first tab stop', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to content' });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeVisible();
  });

  test('navigates to the design system from the header', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Design system' })
      .click();

    await expect(page).toHaveURL(/\/design-system$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Design system' })).toBeVisible();
  });

  test('switches between light and dark themes', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /Switch to (light|dark) theme/ });
    await toggle.click();

    await expect(page.locator('html')).toHaveClass(/dark|light/);
  });

  test('renders the not-found page for an unknown route', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'We could not find that page' })).toBeVisible();
  });
});
