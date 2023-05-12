import { Database } from 'chatbot-ui-core';
import { LocalDatabase } from 'chatbot-ui-local-storage';

let database: Database | null = null;

export const getDatabase = async () => {
  if (database) {
    return database;
  } else {
    database = new LocalDatabase();
    await database.connect();
    return database;
  }
};
