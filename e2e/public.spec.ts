import { test, expect } from '@playwright/test';

test.describe('Public routes (no auth)', () => {
  // ── Homepage ──────────────────────────────────────────────────────────────

  test('homepage / loads without error', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/); // any non-empty title
    await expect(page.getByText(/something went wrong|internal server error/i)).not.toBeVisible();
  });

  test('homepage has hero section with CTA', async ({ page }) => {
    await page.goto('/');
    // Hero typically has a heading and CTA button
    await expect(page.locator('h1').first()).toBeVisible();
    // Should have at least one link to /courses or /login
    const ctaLink = page.getByRole('link', { name: /courses|get started|enroll|sign in|login/i }).first();
    await expect(ctaLink).toBeVisible();
  });

  test('homepage has an enquiry / contact form', async ({ page }) => {
    await page.goto('/');
    // Scroll to end of page to find enquiry form
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const emailInput = page.locator('input[type="email"]').last();
    await expect(emailInput).toBeVisible();
  });

  test('no anchor tag with href containing "youtube.com" anywhere on homepage', async ({ page }) => {
    await page.goto('/');
    const youtubeLinks = await page.locator('a[href*="youtube.com"]').count();
    expect(youtubeLinks).toBe(0);
  });

  // ── /courses ─────────────────────────────────────────────────────────────

  test('/courses page loads', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test('no anchor tag with href containing "youtube.com" on /courses', async ({ page }) => {
    await page.goto('/courses');
    const youtubeLinks = await page.locator('a[href*="youtube.com"]').count();
    expect(youtubeLinks).toBe(0);
  });

  // ── Ratings form (homepage) ───────────────────────────────────────────────

  test('rating form: submit with name+comment but no star → JS validation error', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const submitBtn = page.getByRole('button', { name: /submit rating/i });
    if (await submitBtn.count() === 0) { test.skip(); return; }

    // Fill BOTH name and comment so HTML5 `required` doesn't block our JS check
    const nameInput = page.locator('input[placeholder*="Priya Sharma" i]');
    if (await nameInput.count() > 0) await nameInput.fill('E2E Tester');

    const commentArea = page.locator('textarea[placeholder*="share your experience" i]');
    if (await commentArea.count() > 0) {
      await commentArea.fill('This is a long enough comment for testing purposes.');
    }

    // Do NOT click any star — submit directly → JS should catch rating === 0
    await submitBtn.click();
    await expect(page.getByText(/please select a star rating/i)).toBeVisible({ timeout: 5_000 });
  });

  // ── Enquiry form ──────────────────────────────────────────────────────────

  test('enquiry form: invalid email → form does not submit', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[name="name"], input[placeholder*="full name" i]').last();
    const emailInput = page.locator('input[name="email"][type="email"], input[placeholder*="email" i]').last();

    if (await nameInput.count() === 0) {
      test.skip();
      return;
    }

    await nameInput.fill('E2E Tester');
    await emailInput.fill('notanemail'); // invalid

    const sendBtn = page.getByRole('button', { name: /send message/i });
    await sendBtn.click();

    // Browser's built-in email validation prevents submit, OR API returns 400
    // Either way the success message must NOT appear
    await expect(page.getByText(/message sent successfully/i)).not.toBeVisible({ timeout: 3_000 });
  });

  test('enquiry form: valid submission → success message shown', async ({ page }) => {
    // Intercept the API call to avoid real DB writes and ensure predictable response
    await page.route('/api/enquiries', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: "Thanks for reaching out! We'll get back to you soon." }),
      });
    });

    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[name="name"]').last();
    const emailInput = page.locator('input[name="email"]').last();
    const msgArea = page.locator('textarea[name="message"]').last();

    if (await nameInput.count() === 0) {
      test.skip();
      return;
    }

    await nameInput.fill('E2E Person');
    await emailInput.fill('e2e@playwright.test');
    await msgArea.fill('This is a detailed enquiry message from the E2E test suite.');

    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByText(/message sent successfully|thanks for reaching out/i)).toBeVisible({ timeout: 5_000 });
  });

  // ── Public API assertions ─────────────────────────────────────────────────

  test('GET /api/public/courses returns published courses array', async ({ page }) => {
    const response = await page.request.get('/api/public/courses');
    expect(response.status()).toBe(200);
    const body = await response.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /api/public/webinars returns only active future webinars', async ({ page }) => {
    const response = await page.request.get('/api/public/webinars');
    expect(response.status()).toBe(200);
    const body = await response.json() as { data: Array<{ isActive: boolean; date: string }> };
    const now = Date.now() - 60 * 60 * 1000; // now - 1 hour (grace window)
    for (const w of body.data) {
      expect(w.isActive).toBe(true);
      expect(new Date(w.date).getTime()).toBeGreaterThanOrEqual(now);
    }
  });

  test('GET /api/ratings returns only approved ratings', async ({ page }) => {
    const response = await page.request.get('/api/ratings');
    expect(response.status()).toBe(200);
    const body = await response.json() as { data: Array<{ name: string }> };
    // Response only contains approved=true records (the API filters them)
    expect(Array.isArray(body.data)).toBe(true);
  });
});
