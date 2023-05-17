import { AUTH_ENABLED } from '@chatbot-ui/core/utils/const';

import { getClientSession } from '../auth/helpers';

import { ChatConfig } from '@/chat.config';
import { Database } from '@chatbot-ui/core';

export const getDatabase = async () => {
  const database: Database = new ChatConfig.database();
  let customAccessToken: string | undefined = undefined;
  if (AUTH_ENABLED) {
    const session = await getClientSession();
    customAccessToken = session?.customAccessToken;
  }
  await database.connect({ customAccessToken: customAccessToken });
  return database;
};
