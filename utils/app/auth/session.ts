import { User } from 'chatbot-ui-core/types/auth';

import { getSession } from 'chatbot-ui-authjs/client-session';

export const getClientSideUser = async () => {
  const session = await getSession();

  const user: User = {
    email: session?.user?.email || 'default_user',
    image: session?.user?.image || null,
    name: session?.user?.name || 'Default User',
  };
  return user;
};
