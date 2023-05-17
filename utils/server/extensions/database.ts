import { NextApiRequest, NextApiResponse } from 'next';

import { getServerSession } from '@/utils/server/auth';
import { AUTH_ENABLED } from '@chatbot-ui/core/utils/const';

import { ChatServerConfig } from '@/chat-server.config';
import { ServerDatabase } from '@chatbot-ui/core';

export const getServerDatabase = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  if (ChatServerConfig.database) {
    const database: ServerDatabase = new ChatServerConfig.database();
    let customAccessToken: string | undefined = undefined;
    if (AUTH_ENABLED) {
      const session = await getServerSession(req, res);
      customAccessToken = session?.customAccessToken;
    }
    await database.connect({ customAccessToken: customAccessToken });
    return database;
  }
  return null;
};
