import { Conversation, Message } from '@/types/chat';
import { StorageType } from '@/types/storage';

import { couchdbSaveConversations } from './documentBased/couchdb/conversations';
import { localSaveConversations } from './documentBased/local/conversations';
import { rdbmsCreateMessage, rdbmsUpdateMessage } from './rdbms/message';
import { rdbmsDeleteMessages } from './rdbms/messages';

export const storageDeleteMessages = (
  storageType: StorageType,
  messageIds: string[],
  selectedConversation: Conversation,
  allMessages: Message[],
  allConversations: Conversation[],
) => {
  let updatedMessages: Message[] = [];

  allMessages.forEach((message) => {
    if (!messageIds.includes(message.id)) {
      updatedMessages.push(message);
    }
  });

  const updatedConversation = {
    ...selectedConversation,
    updatedMessages,
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
    rdbmsDeleteMessages(messageIds);
  } else {
    localSaveConversations(updatedConversations);
  }

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};
