import { test, expect } from '@playwright/test';
import { SEED } from './global-setup';

test.describe('Auth flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  async function fillLogin(page: Parameters<typeof test>[1], email: string, password: string) {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
  }

  // ── Successful logins ──────────────────────────────────────────────────────

  test('admin logs in → /admin/dashboard', async ({ page }) => {
    await fillLogin(page, SEED.admin.email, SEED.admin.password);
    await page.waitForURL('**/admin/dashboard', { timeout: 10_000 });
    await expect(page).toHaveURL(/admin\/dashboard/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('teacher logs in → /teacher/dashboard', async ({ page }) => {
    await fillLogin(page, SEED.teacher.email, SEED.teacher.password);
    await page.waitForURL('**/teacher/dashboard', { timeout: 10_000 });
    await expect(page).toHaveURL(/teacher\/dashboard/);
  });

  test('student logs in → /student/dashboard', async ({ page }) => {
    await fillLogin(page, SEED.student.email, SEED.student.password);
    await page.waitForURL('**/student/dashboard', { timeout: 10_000 });
    await expect(page).toHaveURL(/student\/dashboard/);
  });

  // ── Failed / restricted logins ─────────────────────────────────────────────

  // NextAuth v5 wraps all authorize() throws as "Configuration" on the client.
  // The specific messages (ban reason, expiry date) only surface when the proxy
  // middleware redirects an ALREADY-authenticated user whose status changed.
  // Tests verify: (a) user stays on /login, (b) an error element is visible.

  test('wrong password → stays on /login, error shown', async ({ page }) => {
    await fillLogin(page, SEED.student.email, 'wrongpassword');
    await expect(page).toHaveURL(/login/);
    // NextAuth v5 returns "Configuration" for all credential failures
    await expect(page.locator('[class*="red"], [class*="error"], .text-red-600').first())
      .toBeVisible({ timeout: 5_000 });
  });

  test('wrong password does NOT reveal user-specific reason (no user enumeration)', async ({ page }) => {
    await fillLogin(page, 'nobody@doesnotexist.test', 'anything');
    await expect(page).toHaveURL(/login/);
    // Both wrong-password and no-such-user show the same generic error
    await expect(page.locator('[class*="red"], [class*="error"], .text-red-600').first())
      .toBeVisible({ timeout: 5_000 });
    // Must NOT show database-specific hints
    await expect(page.getByText(/user not found/i)).not.toBeVisible();
    await expect(page.getByText(/no account/i)).not.toBeVisible();
  });

  test('banned student → stays on /login, error shown', async ({ page }) => {
    await fillLogin(page, SEED.banned.email, SEED.banned.password);
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('[class*="red"], [class*="error"], .text-red-600').first())
      .toBeVisible({ timeout: 5_000 });
  });

  test('expired student → stays on /login, error shown', async ({ page }) => {
    await fillLogin(page, SEED.expired.email, SEED.expired.password);
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('[class*="red"], [class*="error"], .text-red-600').first())
      .toBeVisible({ timeout: 5_000 });
  });

  test('inactive student → stays on /login, error shown', async ({ page }) => {
    await fillLogin(page, SEED.inactive.email, SEED.inactive.password);
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('[class*="red"], [class*="error"], .text-red-600').first())
      .toBeVisible({ timeout: 5_000 });
  });

  // ── Role-based redirects ───────────────────────────────────────────────────

  test('authenticated student navigates to /admin/dashboard → redirected to /student/dashboard', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/login');
    await fillLogin(page, SEED.student.email, SEED.student.password);
    await page.waitForURL('**/student/dashboard', { timeout: 10_000 });

    // Now try to navigate to admin dashboard
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/student/dashboard', { timeout: 5_000 });
    await expect(page).toHaveURL(/student\/dashboard/);
    await ctx.close();
  });

  test('authenticated teacher navigates to /student/dashboard → redirected to /teacher/dashboard', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/login');
    await fillLogin(page, SEED.teacher.email, SEED.teacher.password);
    await page.waitForURL('**/teacher/dashboard', { timeout: 10_000 });

    await page.goto('/student/dashboard');
    await page.waitForURL('**/teacher/dashboard', { timeout: 5_000 });
    await expect(page).toHaveURL(/teacher\/dashboard/);
    await ctx.close();
  });

  test('unauthenticated user navigates to /admin/dashboard → redirected to /login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/login**', { timeout: 5_000 });
    await expect(page).toHaveURL(/login/);
  });
});
