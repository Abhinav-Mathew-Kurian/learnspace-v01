interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  avatar: string;
  isBanned: boolean;
  banReason: string;
  isActive: boolean;
  subscriptionExpiry: string | null;
}

interface MockSession {
  user: MockUser;
  expires: string;
}

export const mockSession = (overrides: Partial<{ user: Partial<MockUser> }> = {}): MockSession => ({
  user: {
    id: 'user123',
    name: 'Test User',
    email: 'test@test.com',
    role: 'student',
    avatar: '',
    isBanned: false,
    banReason: '',
    isActive: true,
    subscriptionExpiry: null,
    ...(overrides.user ?? {}),
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
});

export const adminSession = (): MockSession =>
  mockSession({ user: { id: 'admin123', name: 'Admin User', email: 'admin@test.com', role: 'admin' } });

export const teacherSession = (): MockSession =>
  mockSession({ user: { id: 'teacher123', name: 'Teacher User', email: 'teacher@test.com', role: 'teacher' } });

export const studentSession = (): MockSession =>
  mockSession({ user: { id: 'student123', name: 'Student User', email: 'student@test.com', role: 'student' } });
