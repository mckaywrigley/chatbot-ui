import { withAuth } from 'next-auth/middleware';

import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from './utils/app/const';

export default withAuth({
  callbacks: {
    async authorized({ token }) {
      if (NEXT_PUBLIC_NEXTAUTH_ENABLED === false) {
        return true;
      }
      if (!token?.email) {
        return false;
      } else {
        const pattern = process.env.NEXTAUTH_EMAIL_PATTERN || '';
        if (!pattern || token?.email?.match('^' + pattern + '$')) {
          return true;
        }
        return false;
      }
    },
  },
});

export const config = { matcher: ['/'] };
