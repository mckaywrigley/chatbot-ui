import { Conversation, Message } from '@/types/chat';
import { StorageType } from '@/types/storage';

import { couchdbSaveConversations } from './documentBased/couchdb/conversations';
import { localSaveConversations } from './documentBased/local/conversations';
import {
  rdbmsCreateMessage,
  rdbmsDeleteMessage,
  rdbmsUpdateMessage,
} from './rdbms/message';

export const storageCreateMessage = async (
  storageType: StorageType,
  conversationId: string,
  message: Message,
  updatedConversations: Conversation[],
) => {
  if (storageType === StorageType.COUCHDB) {
    await couchdbSaveConversations(updatedConversations);
  } else if (storageType === StorageType.RDBMS) {
    await rdbmsCreateMessage(conversationId, message);
  } else {
    localSaveConversations(updatedConversations);
  }
};

export const storageUpdateMessage = (
  storageType: StorageType,
  conversationId: string,
  message: Message,
  updatedConversations: Conversation[],
) => {
  if (storageType === StorageType.COUCHDB) {
    couchdbSaveConversations(updatedConversations);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsUpdateMessage(conversationId, message);
  } else {
    localSaveConversations(updatedConversations);
  }
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
