import { NextApiRequest, NextApiResponse } from 'next';

import { ensureHasValidSession, getUserHash } from '@/utils/server/auth';
import { UserDb } from '@/utils/server/storage';

import { Conversation } from '@/types/chat';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (!(await ensureHasValidSession(req, res))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userHash = await getUserHash(req, res);
    if (req.method === 'POST') {
      return await post(req, res, userHash);
    } else {
      return await get(req, res, userHash);
    }
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// get conversations
const get = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userHash: string,
) => {
  const userDb = await UserDb.fromUserHash(userHash);
  const conversations: Conversation[] = await userDb.getConversations();
  res.status(200).json(conversations);
};

// post conversations
const post = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userHash: string,
) => {
  const conversations = req.body as Conversation[];
  const userDb = await UserDb.fromUserHash(userHash);
  await userDb.saveConversations(conversations);
  res.status(200).json({ success: true });
};

export default handler;
