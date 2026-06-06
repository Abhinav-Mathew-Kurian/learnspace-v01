import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from './mongodb';
import User from '@/models/User';
import { UserRole } from '@/types';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();

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

        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) throw new Error('Invalid credentials');

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          avatar: user.avatar,
          isBanned: user.isBanned,
          banReason: user.banReason ?? '',
          isActive: user.isActive,
          subscriptionExpiry: user.subscriptionExpiry
            ? new Date(user.subscriptionExpiry).toISOString()
            : null,
        };
      },
    }),
  ],
});
