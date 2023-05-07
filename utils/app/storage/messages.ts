import { User } from 'chatbot-ui-core/types/auth';
import { Conversation, Message } from 'chatbot-ui-core/types/chat';

import { Database } from 'chatbot-ui-core';

export const storageGetMessages = async (
  database: Database,
  user: User,
  selectedConversation: Conversation,
) => {
  return await database.getMessages(user, selectedConversation.id);
};

export const storageCreateMessages = (
  database: Database,
  user: User,
  selectedConversation: Conversation,
  newMessages: Message[],
  allConversations: Conversation[],
) => {
  const messages = selectedConversation.messages;
  const updatedMessages = [...messages, ...newMessages];

  const updatedConversation: Conversation = {
    ...selectedConversation,
    messages: updatedMessages,
  };

  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  database.createMessages(user, selectedConversation.id, newMessages);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const storageUpdateMessages = (
  database: Database,
  user: User,
  selectedConversation: Conversation,
  updatedMessages: Message[],
  allConversations: Conversation[],
) => {
  // Creating a new array that replaces the old messages with the updated messages
  const updatedMessageList = selectedConversation.messages.map((message) => {
    const updatedMessage = updatedMessages.find((m) => m.id === message.id);
    if (updatedMessage) {
      return updatedMessage;
    }
    return message;
  });

  const updatedConversation: Conversation = {
    ...selectedConversation,
    messages: updatedMessageList,
  };

  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  database.updateMessages(user, updatedMessages);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const storageDeleteMessages = (
  database: Database,
  user: User,
  messageIds: string[],
  selectedConversation: Conversation,
  allMessages: Message[],
  allConversations: Conversation[],
) => {
  // Creating a new array of messages that does not include the deleted messages
  const updatedMessages = allMessages.filter(
    (message) => !messageIds.includes(message.id),
  );

  const updatedConversation: Conversation = {
    ...selectedConversation,
    messages: updatedMessages,
  };

  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  database.deleteMessages(user, messageIds);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};
