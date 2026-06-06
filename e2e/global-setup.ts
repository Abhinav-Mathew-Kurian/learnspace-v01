/**
 * Playwright global setup — seeds the test database and saves auth storage states
 * for admin, teacher, and student so fixtures can start pre-authenticated.
 *
 * Requires the Next.js server to already be running at PLAYWRIGHT_BASE_URL
 * (defaults to http://localhost:3000). Run `npm run build && npm start` first,
 * or use `next dev` in a separate terminal.
 */
import { chromium } from '@playwright/test';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

// Parse and inject one env file into process.env
function parseEnvFile(envPath: string) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

// Load .env.local first (takes precedence), then .env — mirror Next.js behaviour
const root = path.join(__dirname, '..');
parseEnvFile(path.join(root, '.env.local'));
parseEnvFile(path.join(root, '.env'));

// Seed credentials used across all E2E tests
export const SEED = {
  admin:   { email: 'e2e-admin@learnspace.test',   password: 'TestPass123!', name: 'E2E Admin'   },
  teacher: { email: 'e2e-teacher@learnspace.test',  password: 'TestPass123!', name: 'E2E Teacher' },
  student: { email: 'e2e-student@learnspace.test',  password: 'TestPass123!', name: 'E2E Student' },
  banned:  { email: 'e2e-banned@learnspace.test',   password: 'TestPass123!', name: 'E2E Banned',  banReason: 'Violated terms' },
  expired: { email: 'e2e-expired@learnspace.test',  password: 'TestPass123!', name: 'E2E Expired' },
  inactive:{ email: 'e2e-inactive@learnspace.test', password: 'TestPass123!', name: 'E2E Inactive' },
};

export const AUTH_STATES = {
  admin:   path.join(__dirname, '.auth-state-admin.json'),
  teacher: path.join(__dirname, '.auth-state-teacher.json'),
  student: path.join(__dirname, '.auth-state-student.json'),
};

async function seedUser(
  col: mongoose.Collection,
  data: Record<string, unknown>,
) {
  const hashed = await bcrypt.hash(data.password as string, 12);
  await col.deleteOne({ email: data.email });
  await col.insertOne({ ...data, password: hashed, createdAt: new Date(), updatedAt: new Date() });
}

async function loginAndSave(
  baseURL: string,
  creds: { email: string; password: string },
  storageStatePath: string,
) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${baseURL}/login`);
  await page.fill('input[name="email"], input[type="email"]', creds.email);
  await page.fill('input[name="password"], input[type="password"]', creds.password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
  await ctx.storageState({ path: storageStatePath });
  await browser.close();
}

export default async function globalSetup() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.warn('[E2E global-setup] No MONGODB_URI — skipping DB seed. Set MONGODB_URI in .env');
    return;
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  // Dynamic import to avoid requiring mongoose types at build time
  await mongoose.connect(mongoUri);
  const col = mongoose.connection.collection('users');

  const oneYear = new Date(Date.now() + 365 * 86_400_000);
  const yesterday = new Date(Date.now() - 86_400_000);

  await seedUser(col, { ...SEED.admin,   role: 'admin',   isActive: true,  isBanned: false });
  await seedUser(col, { ...SEED.teacher, role: 'teacher', isActive: true,  isBanned: false });
  await seedUser(col, { ...SEED.student, role: 'student', isActive: true,  isBanned: false, subscriptionExpiry: oneYear });
  await seedUser(col, { ...SEED.banned,  role: 'student', isActive: true,  isBanned: true,  banReason: SEED.banned.banReason });
  await seedUser(col, { ...SEED.expired, role: 'student', isActive: true,  isBanned: false, subscriptionExpiry: yesterday });
  await seedUser(col, { ...SEED.inactive,role: 'student', isActive: false, isBanned: false });

  await mongoose.disconnect();

  // Save auth storage states so fixtures can start pre-authenticated
  await loginAndSave(baseURL, SEED.admin,   AUTH_STATES.admin);
  await loginAndSave(baseURL, SEED.teacher, AUTH_STATES.teacher);
  await loginAndSave(baseURL, SEED.student, AUTH_STATES.student);

  console.log('[E2E global-setup] Seeded users and saved auth states.');
}
