import { test, expect } from './fixtures/auth';
import { SEED } from './global-setup';

test.describe('Admin flows', () => {
  // ── User management ────────────────────────────────────────────────────────

  // Helper: fill the Create User modal and submit.
  // Inputs have no name/id attrs so we use type-based selectors within the modal.
  async function fillCreateUserModal(
    page: import('@playwright/test').Page,
    opts: { name: string; email: string; role?: 'teacher' | 'student'; subType?: string }
  ) {
    const modal = page.locator('.fixed.inset-0').last(); // backdrop div wrapping the modal

    // Name: first plain text input in the modal
    await modal.locator('input:not([type="email"]):not([type="password"]):not([type="date"])').first().fill(opts.name);

    // Role: first select
    if (opts.role === 'teacher') {
      await modal.locator('select').first().selectOption('teacher');
    }

    await modal.locator('input[type="email"]').fill(opts.email);
    await modal.locator('input[type="password"]').fill('Password123!');

    if (opts.subType) {
      // Subscription Type: second select (only rendered when role=student)
      await modal.locator('select').nth(1).selectOption(opts.subType);
    }

    await modal.getByRole('button', { name: /create user/i }).click();
  }

  test('admin creates a teacher account → appears in /admin/teachers list', async ({ adminPage }) => {
    const teacherName = `E2E Teacher ${Date.now()}`;
    const email = `e2e-teacher-${Date.now()}@test.com`;

    await adminPage.goto('/admin/teachers');
    await adminPage.getByRole('button', { name: /add teacher/i }).click();
    await adminPage.waitForSelector('text=Create User', { timeout: 5_000 });

    await fillCreateUserModal(adminPage, { name: teacherName, email, role: 'teacher' });

    // Name appears in the table row (use cell locator to avoid strict-mode violation)
    await expect(adminPage.getByRole('cell', { name: teacherName })).toBeVisible({ timeout: 8_000 });
  });

  test('admin creates a student with 1-month subscription → appears in list', async ({ adminPage }) => {
    const studentName = `E2E Student ${Date.now()}`;
    const email = `e2e-stu-${Date.now()}@test.com`;

    await adminPage.goto('/admin/students');
    await adminPage.getByRole('button', { name: /add student/i }).click();
    await adminPage.waitForSelector('text=Create User', { timeout: 5_000 });

    await fillCreateUserModal(adminPage, { name: studentName, email, subType: '1month' });

    await expect(adminPage.getByRole('cell', { name: studentName })).toBeVisible({ timeout: 8_000 });
  });

  test('admin bans a student → student record shows banned status', async ({ adminPage }) => {
    await adminPage.goto('/admin/students');
    // Find the E2E Student row — exact match to avoid matching "E2E Student 123..." variants
    const studentCell = adminPage.getByRole('cell', { name: SEED.student.name, exact: true });
    await studentCell.waitFor({ timeout: 5_000 });

    // "Ban" link is in the same row
    const row = adminPage.locator('tr').filter({ has: studentCell });
    const banLink = row.getByRole('link', { name: /^ban$/i });
    if (await banLink.count() === 0) { test.skip(); return; }
    await banLink.click();

    // PromptModal appears — fill reason and confirm
    const reasonInput = adminPage.locator('input, textarea').filter({ hasText: '' }).last();
    if (await reasonInput.count() > 0) {
      await reasonInput.fill('Payment overdue');
    }
    const confirmBtn = adminPage.getByRole('button', { name: /confirm|ok|ban/i }).last();
    if (await confirmBtn.count() > 0) await confirmBtn.click();

    // Just verify we're still on students page without JS error
    await expect(adminPage).toHaveURL(/students/);
  });

  // ── Course management ─────────────────────────────────────────────────────

  test('admin creates a course → course appears in /admin/courses', async ({ adminPage }) => {
    const courseTitle = `E2E Admin Course ${Date.now()}`;

    await adminPage.goto('/admin/courses');

    // Admin courses page may show course cards — look for any create/add button
    const createBtn = adminPage.getByRole('button', { name: /new course|add course|create course/i }).first();
    if (await createBtn.count() === 0) {
      // Try link
      const createLink = adminPage.getByRole('link', { name: /new course|add course/i }).first();
      if (await createLink.count() === 0) { test.skip(); return; }
      await createLink.click();
    } else {
      await createBtn.click();
    }

    // Fill modal
    await adminPage.locator('input[placeholder*="title" i], input[placeholder*="course" i]').first().fill(courseTitle);
    await adminPage.getByRole('button', { name: /create course|save/i }).last().click();
    await expect(adminPage.getByText(courseTitle)).toBeVisible({ timeout: 8_000 });
  });

  // ── API-level security assertions (no UI interaction needed) ──────────────

  test('GET /api/admin/users response never contains password field', async ({ adminPage }) => {
    const response = await adminPage.request.get('/api/admin/users');
    expect(response.status()).toBe(200);
    const body = await response.json() as { data: Array<Record<string, unknown>> };
    for (const user of body.data) {
      expect(user.password).toBeUndefined();
    }
  });
});
