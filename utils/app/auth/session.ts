import { getSession } from 'next-auth/react';

import { User } from '@/types/auth';

export const getClientSideUser = async () => {
  const session = await getSession();

  console.log('session', session);

  const user: User = {
    id: session?.user?.email!,
  };

  console.log('user', user);
  return user;
};
