import { Database } from 'chatbot-ui-core';
import { ClientSideDatabase } from 'chatbot-ui-rdbms/client-side';

export const getDatabase = async () => {
  const database: Database = new ClientSideDatabase();
  await database.connect();
  return database;
};
