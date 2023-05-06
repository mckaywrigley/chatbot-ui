import {withAuth} from 'next-auth/middleware';

import {NEXT_PUBLIC_NEXTAUTH_ENABLED} from './utils/app/const';

const getSecret = () => {
  if (!NEXT_PUBLIC_NEXTAUTH_ENABLED) {
    return 'auth_not_enabled';
  } else {
    return process.env.NEXTAUTH_SECRET;
  }
};

export default withAuth({
  callbacks: {
    async authorized({token}) {
      if (!NEXT_PUBLIC_NEXTAUTH_ENABLED) {
        return true;
      }
      if (!token?.email) {
        return false;
      } else {
        const pattern = process.env.NEXTAUTH_EMAIL_PATTERN || '';
        return !!(!pattern || token?.email?.match('^' + pattern + '$'));

      }
    },
  },
  secret: getSecret(),
});

export const config = {matcher: ['/']};
