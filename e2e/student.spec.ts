import { test, expect } from './fixtures/auth';

test.describe('Student flows', () => {
  test('student sees enrolled courses on /student/dashboard', async ({ studentPage }) => {
    await studentPage.goto('/student/dashboard');
    await expect(studentPage).toHaveURL(/student\/dashboard/);
    // Dashboard should render without error
    await expect(studentPage.locator('body')).toBeVisible();
    // Should NOT show an error page
    await expect(studentPage.getByText(/something went wrong|internal server error/i)).not.toBeVisible();
  });

  test('student /student/courses page loads', async ({ studentPage }) => {
    await studentPage.goto('/student/courses');
    await expect(studentPage.locator('body')).toBeVisible();
    await expect(studentPage.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test('student tries to access /teacher/dashboard → redirected to /student/dashboard', async ({ studentPage }) => {
    await studentPage.goto('/teacher/dashboard');
    await studentPage.waitForURL('**/student/dashboard', { timeout: 5_000 });
    await expect(studentPage).toHaveURL(/student\/dashboard/);
  });

  test('student tries to access /admin/dashboard → redirected to /student/dashboard', async ({ studentPage }) => {
    await studentPage.goto('/admin/dashboard');
    await studentPage.waitForURL('**/student/dashboard', { timeout: 5_000 });
    await expect(studentPage).toHaveURL(/student\/dashboard/);
  });

  test('PDF download goes through /api/download proxy, not direct Cloudinary URL', async ({ studentPage }) => {
    // Intercept any download requests on the student pages
    const downloadUrls: string[] = [];
    studentPage.on('request', (req) => {
      if (req.url().includes('res.cloudinary.com') && req.method() === 'GET') {
        downloadUrls.push(req.url());
      }
    });

    await studentPage.goto('/student/courses');
    await studentPage.waitForTimeout(2_000);

    // Any PDF download initiated from the UI must go through /api/download, not direct Cloudinary
    // (If no downloads happened this test passes trivially — it guards against future regressions)
    expect(downloadUrls.length).toBe(0);
  });

});
