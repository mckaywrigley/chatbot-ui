import { User } from 'chatbot-ui-core/types/auth';
import { Conversation } from 'chatbot-ui-core/types/chat';

import { saveSelectedConversation } from './selectedConversation';

import { Database } from 'chatbot-ui-core';

export const storageCreateConversation = (
  database: Database,
  user: User,
  newConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = [...allConversations, newConversation];

  database.createConversation(user, newConversation).then((success) => {
    if (!success) {
      console.log('Failed to create conversation');
    }
  });

  return updatedConversations;
};

export const storageUpdateConversation = (
  database: Database,
  user: User,
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveSelectedConversation(user, updatedConversation);

  database.updateConversation(user, updatedConversation).then((success) => {
    if (!success) {
      console.log('Failed to update conversation');
    }
  });

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const storageDeleteConversation = (
  database: Database,
  user: User,
  conversationId: string,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.filter(
    (c) => c.id !== conversationId,
  );

  database.deleteConversation(user, conversationId).then((success) => {
    if (!success) {
      console.log('Failed to delete conversation');
    }
  });

  return updatedConversations;
};
