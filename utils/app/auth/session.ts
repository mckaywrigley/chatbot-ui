import { getSession } from 'next-auth/react';

import { User } from 'chatbot-ui-core/types/auth';

export const getClientSideUser = async () => {
  const session = await getSession();

  const user: User = {
    id: session?.user?.email || 'default_user',
  };
  return user;
};
