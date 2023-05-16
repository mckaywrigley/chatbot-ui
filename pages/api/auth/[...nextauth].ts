import NextAuth, { NextAuthOptions } from 'next-auth';

import {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_JWT_SECRET,
  SUPABASE_SERVICE_ROLE_KEY,
} from '@/utils/app/auth/constants';
import { getProviders } from '@/utils/app/auth/providers';

import { SupabaseAdapter } from '@next-auth/supabase-adapter';
import jwt from 'jsonwebtoken';

export const authOptions: NextAuthOptions = {
  providers: await getProviders(),
  session: { strategy: 'jwt' },

  // Supabase adapter is only enabled if JWT secret is specified
  adapter: SUPABASE_JWT_SECRET
    ? SupabaseAdapter({
        url: NEXT_PUBLIC_SUPABASE_URL,
        secret: SUPABASE_SERVICE_ROLE_KEY,
      })
    : undefined,
  callbacks: {
    async session({ session, token }) {
      const signingSecret = SUPABASE_JWT_SECRET;
      if (signingSecret) {
        const payload = {
          aud: 'authenticated',
          exp: Math.floor(new Date(session.expires).getTime() / 1000),
          sub: token.sub,
          email: token.email,
          role: 'authenticated',
        };
        session.supabaseAccessToken = jwt.sign(payload, signingSecret);
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
