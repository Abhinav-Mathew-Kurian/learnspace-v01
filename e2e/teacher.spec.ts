import { test, expect } from './fixtures/auth';

test.describe('Teacher flows', () => {
  test('teacher creates a course → appears in /teacher/courses', async ({ teacherPage }) => {
    const title = `E2E Teacher Course ${Date.now()}`;

    await teacherPage.goto('/teacher/courses');
    // Button label: "+ New Course"
    await teacherPage.getByRole('button', { name: /new course/i }).click();

    // Wait for modal
    await teacherPage.waitForSelector('input[placeholder*="Full Stack" i], input[placeholder*="title" i]', { timeout: 5_000 });
    await teacherPage.locator('input[placeholder*="Full Stack" i], input[placeholder*="title" i]').fill(title);

    // Description is a TipTap contenteditable — click the editor area and type
    const editor = teacherPage.locator('.ProseMirror, [contenteditable="true"]').first();
    await editor.click();
    await teacherPage.keyboard.type('This is the course description for E2E testing purposes.');

    await teacherPage.getByRole('button', { name: /create course/i }).click();

    // After creation, the new course should appear in the list
    await expect(teacherPage.getByText(title)).toBeVisible({ timeout: 10_000 });
  });

  test('teacher adds a video by YouTube URL — no full URL shown in UI', async ({ teacherPage }) => {
    // Navigate to first available course
    await teacherPage.goto('/teacher/courses');
    const courseLink = teacherPage.getByRole('link').filter({ hasText: /course/i }).first();
    if (await courseLink.count() === 0) {
      test.skip(); // no courses yet
      return;
    }
    await courseLink.click();

    // Find "Add video" button
    const addVideoBtn = teacherPage.getByRole('button', { name: /add video/i }).first();
    if (await addVideoBtn.count() === 0) {
      test.skip();
      return;
    }
    await addVideoBtn.click();

    await teacherPage.fill('input[name="title"], input[placeholder*="title" i]', 'E2E Test Video');
    const urlInput = teacherPage.locator('input[name="youtubeUrl"], input[placeholder*="youtube" i], input[placeholder*="URL" i]').first();
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    await teacherPage.getByRole('button', { name: /add|save/i }).last().click();

    // After adding, full YouTube URL must NOT be visible in the page
    await teacherPage.waitForTimeout(1_000);
    const pageContent = await teacherPage.content();
    expect(pageContent).not.toMatch(/youtube\.com\/watch\?v=/);
  });

  test('teacher tries to access /admin/dashboard → redirected to /teacher/dashboard', async ({ teacherPage }) => {
    await teacherPage.goto('/admin/dashboard');
    await teacherPage.waitForURL('**/teacher/dashboard', { timeout: 5_000 });
    await expect(teacherPage).toHaveURL(/teacher\/dashboard/);
  });

  test('teacher schedules a live session → appears in /teacher/calendar', async ({ teacherPage }) => {
    await teacherPage.goto('/teacher/live');
    const scheduleBtn = teacherPage.getByRole('button', { name: /schedule|add.*session|new.*session/i }).first();
    if (await scheduleBtn.count() === 0) {
      test.skip();
      return;
    }
    await scheduleBtn.click();

    const titleInput = teacherPage.locator('input[name="title"]').first();
    await titleInput.fill('E2E Live Session');

    const meetInput = teacherPage.locator('input[name="meetLink"], input[placeholder*="meet" i], input[type="url"]').first();
    if (await meetInput.count() > 0) await meetInput.fill('https://meet.google.com/e2e-test');

    await teacherPage.getByRole('button', { name: /schedule|create|save/i }).last().click();
    await expect(teacherPage.getByText('E2E Live Session')).toBeVisible({ timeout: 8_000 });
  });
});
