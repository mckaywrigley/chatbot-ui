import { getSession } from 'next-auth/react';

import { User } from '@/types/auth';

export const getClientSideUser = async () => {
  const session = await getSession();

  if (!session?.user?.email) {
    return 'default_user';
  }
  const user: User = {
    id: session?.user?.email,
  };
  return user;
};
