import NextAuth, { NextAuthOptions, PagesOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

const providers = [];
if (process.env.NEXTAUTH_ENABLED === 'false') {
  providers.push(
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'text' },
      },
      async authorize(credentials: any, req: any) {
        const email = credentials.email.trim();
        return {
          id: 'a',
          email,
        };
      },
    }),
  );
}
if (process.env.GOOGLE_CLIENT_ID) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  );
}
if (process.env.GITHUB_CLIENT_ID) {
  providers.push(
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  );
}

let pages: Partial<PagesOptions> = {};

if (process.env.NEXTAUTH_ENABLED === 'false') {
  pages['signIn'] = '/auth/autologin';
}

export const authOptions: NextAuthOptions = {
  providers: providers,
  session: { strategy: 'jwt' },
  pages,
};

export default NextAuth(authOptions);
