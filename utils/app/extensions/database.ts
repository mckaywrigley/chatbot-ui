import { Database } from '@chatbot-ui/core';
import { LocalDatabase } from '@chatbot-ui/local-storage';

export const getDatabase = async () => {
  const database: Database = new LocalDatabase();
  await database.connect();
  return database;
};
