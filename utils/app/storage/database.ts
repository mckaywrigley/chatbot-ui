import { Database } from 'chatbot-ui-core';
import { ClientSideDatabase } from 'chatbot-ui-rdbms/client-side';

let database: Database | null = null;

export const getDatabase = async () => {
  if (database) {
    return database;
  } else {
    database = new ClientSideDatabase();
    await database.connect();
    return database;
  }
};
