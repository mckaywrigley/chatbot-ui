import { Conversation, Message } from '@/types/chat';
import { StorageType } from '@/types/storage';

import { couchdbSaveConversations } from './documentBased/couchdb/conversations';
import { localSaveConversations } from './documentBased/local/conversations';
import {
  rdbmsCreateMessage,
  rdbmsDeleteMessage,
  rdbmsUpdateMessage,
} from './rdbms/message';

export const storageCreateMessage = (
  storageType: StorageType,
  selectedConversation: Conversation,
  newMessage: Message,
  allConversations: Conversation[],
) => {
  const messages = selectedConversation.messages;
  const updatedMessages = [...messages, newMessage];
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

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveConversations(updatedConversations);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsCreateMessage(selectedConversation.id, newMessage);
  } else {
    localSaveConversations(updatedConversations);
  }

  return { single: updatedConversation, all: updatedConversations };
};

export const storageUpdateMessage = (
  storageType: StorageType,
  selectedConversation: Conversation,
  updatedMessage: Message,
  allConversations: Conversation[],
) => {
  const messages = selectedConversation.messages;
  const updatedMessages = messages.map((m) =>
    m.id === updatedMessage.id ? updatedMessage : m,
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

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveConversations(updatedConversations);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsUpdateMessage(updatedConversation.id, updatedMessage);
  } else {
    localSaveConversations(updatedConversations);
  }

  return { single: updatedConversation, all: updatedConversations };
};

export const storageDeleteMessage = (
  storageType: StorageType,
  messageId: string,
  updatedConversations: Conversation[],
) => {
  if (storageType === StorageType.COUCHDB) {
    couchdbSaveConversations(updatedConversations);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsDeleteMessage(messageId);
  } else {
    localSaveConversations(updatedConversations);
  }
};
