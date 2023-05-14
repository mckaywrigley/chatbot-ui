import { withAuth } from 'next-auth/middleware';

import { AUTH_ENABLED } from 'chatbot-ui-core/utils/const';
import { dockerEnvVarFix } from 'chatbot-ui-core/utils/docker';

const getSecret = () => {
  if (!AUTH_ENABLED) {
    return 'auth_not_enabled';
  } else {
    return dockerEnvVarFix(process.env.NEXTAUTH_SECRET);
  }
};

export default withAuth({
  callbacks: {
    async authorized({ token }) {
      if (AUTH_ENABLED === false) {
        return true;
      }
      if (!token?.email) {
        return false;
      } else {
        const pattern =
          dockerEnvVarFix(process.env.NEXTAUTH_EMAIL_PATTERN) || '';
        if (!pattern || token?.email?.match('^' + pattern + '$')) {
          return true;
        }

        return false;
      }
    },
  },
  secret: getSecret(),
});
