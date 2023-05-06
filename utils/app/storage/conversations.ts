import {Conversation} from '@/types/chat';
import {StorageType} from '@/types/storage';

import {
  localDeleteConversations,
  localGetConversations,
  localSaveConversations,
} from './documentBased/local/conversations';
import {
  rdbmsDeleteConversations,
  rdbmsGetConversations,
  rdbmsUpdateConversations,
} from './rdbms/conversations';

export const storageGetConversations = async (storageType: StorageType) => {
 if (storageType === StorageType.RDBMS) {
    return await rdbmsGetConversations();
  } else {
    return localGetConversations();
  }
};

export const storageUpdateConversations = async (
    storageType: StorageType,
    conversations: Conversation[],
) => {
  if (storageType === StorageType.RDBMS) {
    await rdbmsUpdateConversations(conversations);
  } else {
    localSaveConversations(conversations);
  }
};

export const storageDeleteConversations = async (storageType: StorageType) => {
 if (storageType === StorageType.RDBMS) {
    await rdbmsDeleteConversations();
  } else {
    localDeleteConversations();
  }
};
