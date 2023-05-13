import { ServerDatabase } from 'chatbot-ui-core';
import { ServerSideDatabase } from 'chatbot-ui-rdbms/server-side';

export const getServerDatabase = async () => {
  const database: ServerDatabase = new ServerSideDatabase();
  await database.connect();
  return database;
};
