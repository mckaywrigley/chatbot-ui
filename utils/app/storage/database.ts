import { Database } from 'chatbot-ui-core';
import { ClientSideDatabase } from 'chatbot-ui-local-storage/src/Database';

let database: Database | null = null;

export const getDatabase = async () => {
  console.log('getDatabase');
  if (database) {
    return database;
  } else {
    database = new ClientSideDatabase();
    await database.connect();
    return database;
  }
};

export const getHandlerLocation = () => {
  return 'chatbot-ui-postgres/src/handlers/';
};
