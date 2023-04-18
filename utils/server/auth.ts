import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

export const ensureHasValidSession = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<boolean> => {
  if (process.env.NEXTAUTH_ENABLED === 'false') {
    return true;
  }
  const session = await getServerSession(req, res, authOptions);
  return session !== null;
};
