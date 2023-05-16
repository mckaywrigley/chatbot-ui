import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession as authjsServerSession } from 'next-auth';

import { User } from '@chatbot-ui/core/types/auth';
import { Session } from '@chatbot-ui/core/types/auth';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

export const getServerSession = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const authjsSession = await authjsServerSession(req, res, authOptions);

  if (authjsSession) {
    let user: User | undefined = undefined;
    if (authjsSession.user) {
      user = {
        email: authjsSession?.user?.email,
        name: authjsSession?.user?.name,
        image: authjsSession?.user?.image,
      };
    }

    const session: Session = {
      user: user,
      expires: authjsSession.expires,
    };

    return session;
  }

  return null;
};
