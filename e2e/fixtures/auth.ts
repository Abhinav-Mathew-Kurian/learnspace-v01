import { test as base, Browser, BrowserContext, Page } from '@playwright/test';
import { AUTH_STATES } from '../global-setup';

interface AuthFixtures {
  adminPage:   Page;
  teacherPage: Page;
  studentPage: Page;
}

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const ctx: BrowserContext = await browser.newContext({ storageState: AUTH_STATES.admin });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },

  teacherPage: async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const ctx: BrowserContext = await browser.newContext({ storageState: AUTH_STATES.teacher });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },

  studentPage: async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const ctx: BrowserContext = await browser.newContext({ storageState: AUTH_STATES.student });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
