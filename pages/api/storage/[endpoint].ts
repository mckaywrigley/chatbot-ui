import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';

import { User } from 'chatbot-ui-core/types/auth';

import { authOptions } from '../auth/[...nextauth]';

// import { ServerDatabase } from 'chatbot-ui-core';
// import { ServerSideDatabase } from 'chatbot-ui-postgres/src/ServerSideDatabase';

export default async function proxy(req: NextApiRequest, res: NextApiResponse) {
  // const database: ServerDatabase = new ServerSideDatabase();
  // try {
  //   const { endpoint } = req.query;
  //   if (!endpoint) {
  //     res.status(404).json({ error: 'Endpoint not found' });
  //     return;
  //   }
  //   const path = database.paths.find((path) => path.endpoint === endpoint);
  //   if (!path) {
  //     res.status(404).json({ error: 'Endpoint not found' });
  //     return;
  //   }
  //   let user: User | null = null;
  //   if (NEXT_PUBLIC_NEXTAUTH_ENABLED) {
  //     const session = await getServerSession(req, res, authOptions);
  //     if (!session) {
  //       return res.status(401).json({ error: 'User is not authenticated' });
  //     } else if (!session.user) {
  //       return res.status(401).json({ error: 'User is not authenticated' });
  //     } else if (!session.user.email) {
  //       return res
  //         .status(401)
  //         .json({ error: 'User does not have an email address' });
  //     }
  //     user = {
  //       id: session.user.email,
  //     };
  //   } else {
  //     user = {
  //       id: 'test_user',
  //     };
  //   }
  //   // Forward the request and response objects to the handler
  //   return path.handler(req, res, user);
  // } catch (error) {
  //   console.error('Error in proxy:', error);
  //   res.status(500).json({ error: 'Server error' });
  // }
}
