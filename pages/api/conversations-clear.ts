import { NextApiRequest, NextApiResponse } from 'next';

import { ensureHasValidSession, getUserHash } from '@/utils/server/auth';
import { UserDb } from '@/utils/server/storage';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    if (!(await ensureHasValidSession(req, res))) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userHash = await getUserHash(req, res);
    const userDb = await UserDb.fromUserHash(userHash);
    await userDb.removeAllConversations();
    res.status(200).json({ success: true });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
export default handler;
