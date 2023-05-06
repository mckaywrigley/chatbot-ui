import { User } from '@/types/auth';
import { Conversation } from '@/types/chat';
import { StorageType } from '@/types/storage';

import { couchdbSaveConversations } from './documentBased/couchdb/conversations';
import { localSaveConversations } from './documentBased/local/conversations';
import {
  rdbmsCreateConversation,
  rdbmsDeleteConversation,
  rdbmsUpdateConversation,
} from './rdbms/conversation';
import { saveSelectedConversation } from './selectedConversation';

export const storageCreateConversation = (
  storageType: StorageType,
  user: User,
  newConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = [...allConversations, newConversation];

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveConversations(updatedConversations);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsCreateConversation(newConversation);
  } else {
    localSaveConversations(user, updatedConversations);
  }

  return updatedConversations;
};

export const storageUpdateConversation = (
  storageType: StorageType,
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

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveConversations(updatedConversations);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsUpdateConversation(updatedConversation);
  } else {
    localSaveConversations(user, updatedConversations);
  }

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const storageDeleteConversation = (
  storageType: StorageType,
  user: User,
  conversationId: string,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.filter(
    (c) => c.id !== conversationId,
  );

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveConversations(updatedConversations);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsDeleteConversation(conversationId);
  } else {
    localSaveConversations(user, updatedConversations);
  }

  return updatedConversations;
};
