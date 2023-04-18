import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    async authorized({ token }) {
      if (process.env.NEXTAUTH_ENABLED === 'false' && token?.email) {
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
