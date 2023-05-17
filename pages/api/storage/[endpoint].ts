import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerSession } from '@/utils/server/auth';
import { getServerDatabase } from '@/utils/server/extensions/database';
import { AUTH_ENABLED } from '@chatbot-ui/core/utils/const';

import { User } from '@chatbot-ui/core/types/auth';

export default async function proxy(req: NextApiRequest, res: NextApiResponse) {
  const database = await getServerDatabase(req, res);
  if (!database) {
    res.status(500).json({ error: 'No server database implemented' });
    return;
  }
  try {
    const { endpoint } = req.query;
    if (!endpoint) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }
    const path = database.paths.find((path) => path.endpoint === endpoint);
    if (!path) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }
    let user: User | null = null;
    if (AUTH_ENABLED) {
      const session = await getServerSession(req, res);
      if (!session) {
        return res.status(401).json({ error: 'User is not authenticated' });
      } else if (!session.user) {
        return res.status(401).json({ error: 'User is not authenticated' });
      } else if (!session.user.email) {
        return res
          .status(401)
          .json({ error: 'User does not have an email address' });
      }
      user = {
        email: session.user.email,
        image: session.user.image,
        name: session.user.name,
      };
    } else {
      user = {
        email: 'default_user',
        image: null,
        name: 'Default User',
      };
    }
    // Forward the request and response objects to the handler
    return path.handler(req, res, user);
  } catch (error) {
    console.error('Error in proxy:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
