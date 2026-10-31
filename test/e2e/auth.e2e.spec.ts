import { type Page, expect, test } from '@playwright/test';

const header = (page: Page) => page.getByRole('navigation', { name: 'Main' });

/**
 * UC-002 through the real product: browser → Next.js Server Actions → Fastify → persistence.
 *
 * Requires the backend to be running (see this directory's README); the web app alone cannot
 * create accounts. Each run registers a unique email, so the journey is repeatable against a
 * database that keeps its users.
 *
 * Deliberately not covered here: rate limiting (it would poison the source address for every
 * subsequent test for a minute — owned by `apps/backend/test/integration/api/auth.api.int.spec.ts`)
 * and per-state form rendering (owned by the component and MSW integration suites in `apps/web`).
 */
test.describe('a visitor signs up, signs out, and signs back in', () => {
  const email = `e2e.${Date.now()}.${process.pid}@example.com`;
  const password = 'a-long-enough-password';

  test('sign-up creates the account and signs it straight in', async ({ page }) => {
    await page.goto('/');
    await header(page).getByRole('link', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/sign-up$/);

    await page.getByLabel('Display name').fill('E2E Buyer');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Auto sign-in: no second form, straight to the storefront as a known user.
    await expect(page).toHaveURL('/');
    await expect(header(page).getByText('E2E Buyer')).toBeVisible();
  });

  test('the session cookie is httpOnly and signs the user out cleanly', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(header(page).getByText('E2E Buyer')).toBeVisible();

    const session = (await page.context().cookies()).find(
      (cookie) => cookie.name === 'marketplace_session'
    );
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Lax');

    await header(page).getByRole('button', { name: 'Sign out' }).click();
    await expect(header(page).getByRole('link', { name: 'Sign in' })).toBeVisible();
    expect(
      (await page.context().cookies()).some((cookie) => cookie.name === 'marketplace_session')
    ).toBe(false);
  });

  test('a wrong password gets the generic failure, never a field-level hint', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page.getByLabel('Email')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('sign-in returns the user to the page they were headed for', async ({ page }) => {
    await page.goto('/sign-in?next=/about');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL('/about');
    await expect(header(page).getByText('E2E Buyer')).toBeVisible();
  });
});
