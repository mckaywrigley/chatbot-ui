import { NextAuth } from 'chatbot-ui-authjs/client-session';
import { Auth } from 'chatbot-ui-core';

export const getUser = async () => {
  const auth: Auth = new NextAuth();

  const session = await auth.session();

  let user = session?.user;

  if (!user) {
    user = {
      email: 'default_user',
      image: null,
      name: 'Default User',
    };
  }

  return user;
};

export const getAuth = () => {
  const auth: Auth = new NextAuth();
  return auth;
};
