/**
 * Tests for the authorize logic inside lib/auth.ts.
 * We extract the logic into a testable wrapper rather than calling NextAuth directly.
 */
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import mongoose from 'mongoose';

// Re-implement the authorize logic as a pure function for testing
interface AuthorizeInput {
  email: string;
  password: string;
}

interface AuthResult {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  isBanned: boolean;
  banReason: string;
  isActive: boolean;
  subscriptionExpiry: string | null;
}

async function authorizeUser(credentials: AuthorizeInput): Promise<AuthResult> {
  const user = await User.findOne({ email: credentials.email }).select('+password');
  if (!user) throw new Error('Invalid credentials');

  if (user.isBanned) throw new Error(user.banReason || 'Your account has been suspended.');

  if (user.role === 'student' && user.subscriptionExpiry) {
    if (new Date() > new Date(user.subscriptionExpiry)) {
      const expDate = new Date(user.subscriptionExpiry).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      throw new Error(`Your access expired on ${expDate}. Contact admin.`);
    }
  }

  if (!user.isActive) throw new Error('Your account has been deactivated. Contact admin.');

  const valid = await bcrypt.compare(credentials.password, user.password);
  if (!valid) throw new Error('Invalid credentials');

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isBanned: user.isBanned,
    banReason: user.banReason ?? '',
    isActive: user.isActive,
    subscriptionExpiry: user.subscriptionExpiry
      ? new Date(user.subscriptionExpiry).toISOString()
      : null,
  };
}

async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  isBanned?: boolean;
  banReason?: string;
  isActive?: boolean;
  subscriptionExpiry?: Date | null;
}) {
  const hashed = await bcrypt.hash(data.password, 10);
  return User.create({ ...data, password: hashed });
}

describe('auth authorize logic', () => {
  it('throws Invalid credentials for non-existent user', async () => {
    await expect(
      authorizeUser({ email: 'nobody@test.com', password: 'pass' })
    ).rejects.toThrow('Invalid credentials');
  });

  it('throws banReason for banned user', async () => {
    await createUser({
      name: 'Banned',
      email: 'banned@test.com',
      password: 'password123',
      role: 'student',
      isBanned: true,
      banReason: 'Violated terms',
    });

    await expect(
      authorizeUser({ email: 'banned@test.com', password: 'password123' })
    ).rejects.toThrow('Violated terms');
  });

  it('throws default suspension message for banned user with no banReason', async () => {
    await createUser({
      name: 'Banned2',
      email: 'banned2@test.com',
      password: 'password123',
      role: 'student',
      isBanned: true,
      banReason: '',
    });

    await expect(
      authorizeUser({ email: 'banned2@test.com', password: 'password123' })
    ).rejects.toThrow('suspended');
  });

  it('throws expiry error for student with subscriptionExpiry yesterday', async () => {
    const yesterday = new Date(Date.now() - 86400000);
    await createUser({
      name: 'Expired',
      email: 'expired@test.com',
      password: 'password123',
      role: 'student',
      subscriptionExpiry: yesterday,
    });

    await expect(
      authorizeUser({ email: 'expired@test.com', password: 'password123' })
    ).rejects.toThrow('expired');
  });

  it('does not throw expiry error for student with subscriptionExpiry tomorrow', async () => {
    const tomorrow = new Date(Date.now() + 86400000);
    await createUser({
      name: 'Active Student',
      email: 'activestudent@test.com',
      password: 'password123',
      role: 'student',
      subscriptionExpiry: tomorrow,
    });

    const result = await authorizeUser({ email: 'activestudent@test.com', password: 'password123' });
    expect(result.email).toBe('activestudent@test.com');
  });

  it('does not throw expiry error for teacher with no subscriptionExpiry', async () => {
    await createUser({
      name: 'Teacher',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'teacher',
    });

    const result = await authorizeUser({ email: 'teacher@test.com', password: 'password123' });
    expect(result.role).toBe('teacher');
  });

  it('does not throw expiry error for admin with no subscriptionExpiry', async () => {
    await createUser({
      name: 'Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
    });

    const result = await authorizeUser({ email: 'admin@test.com', password: 'password123' });
    expect(result.role).toBe('admin');
  });

  it('throws deactivated for inactive user', async () => {
    await createUser({
      name: 'Inactive',
      email: 'inactive@test.com',
      password: 'password123',
      role: 'student',
      isActive: false,
    });

    await expect(
      authorizeUser({ email: 'inactive@test.com', password: 'password123' })
    ).rejects.toThrow('deactivated');
  });

  it('throws Invalid credentials for wrong password', async () => {
    await createUser({
      name: 'ValidUser',
      email: 'validuser@test.com',
      password: 'correctpassword',
      role: 'student',
    });

    await expect(
      authorizeUser({ email: 'validuser@test.com', password: 'wrongpassword' })
    ).rejects.toThrow('Invalid credentials');
  });

  it('returns full user object for valid student credentials', async () => {
    await createUser({
      name: 'Good Student',
      email: 'goodstudent@test.com',
      password: 'password123',
      role: 'student',
    });

    const result = await authorizeUser({ email: 'goodstudent@test.com', password: 'password123' });
    expect(result.email).toBe('goodstudent@test.com');
    expect(result.role).toBe('student');
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Good Student');
    expect(result.isBanned).toBe(false);
    expect(result.isActive).toBe(true);
    expect(result.subscriptionExpiry).toBeNull();
  });

  it('returns full user object for valid teacher credentials', async () => {
    await createUser({
      name: 'Good Teacher',
      email: 'goodteacher@test.com',
      password: 'password123',
      role: 'teacher',
    });

    const result = await authorizeUser({ email: 'goodteacher@test.com', password: 'password123' });
    expect(result.role).toBe('teacher');
    expect(result.email).toBe('goodteacher@test.com');
  });

  it('returned user object does not include password field', async () => {
    await createUser({
      name: 'NoPass',
      email: 'nopass@test.com',
      password: 'password123',
      role: 'student',
    });

    const result = await authorizeUser({ email: 'nopass@test.com', password: 'password123' });
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });
});
