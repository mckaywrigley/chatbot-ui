import { NextAuth } from 'chatbot-ui-authjs/server-session';
import { ServerAuth } from 'chatbot-ui-core';

export const getServerAuth = () => {
  const auth: ServerAuth = new NextAuth();
  return auth;
};
