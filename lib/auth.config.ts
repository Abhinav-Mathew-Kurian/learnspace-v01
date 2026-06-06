import type { NextAuthConfig } from 'next-auth';
import type { UserRole } from '@/types';

// Edge-safe config — no Node.js-only imports (no mongoose, no bcrypt).
// Used by middleware.ts. The full Credentials provider is added in lib/auth.ts.
export const authConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
        token.avatar = (user as { avatar?: string }).avatar ?? '';
        token.isBanned = (user as { isBanned?: boolean }).isBanned ?? false;
        token.banReason = (user as { banReason?: string }).banReason ?? '';
        token.isActive = (user as { isActive?: boolean }).isActive ?? true;
        token.subscriptionExpiry = (user as { subscriptionExpiry?: string | null }).subscriptionExpiry ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.avatar = token.avatar as string;
      session.user.isBanned = token.isBanned as boolean ?? false;
      session.user.banReason = token.banReason as string ?? '';
      session.user.isActive = token.isActive as boolean ?? true;
      session.user.subscriptionExpiry = token.subscriptionExpiry as string | null ?? null;
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt' },
  trustHost: true,
};
