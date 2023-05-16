import { getSession } from 'next-auth/react';

import { Database } from '@chatbot-ui/core';
import { ClientDatabase } from '@chatbot-ui/supabase/client-side';

export const getDatabase = async () => {
  const session = await getSession();
  const database: Database = new ClientDatabase();
  await database.connect({
    supabaseAccessToken: session?.supabaseAccessToken,
  });
  return database;
};
