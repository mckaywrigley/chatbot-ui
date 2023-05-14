import NextAuth, { NextAuthOptions } from 'next-auth';

import { getProviders } from '@/utils/app/auth/providers';

export const authOptions: NextAuthOptions = {
  providers: await getProviders(),
  session: { strategy: 'jwt' },
};

export default NextAuth(authOptions);
