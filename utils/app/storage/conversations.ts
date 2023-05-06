import { User } from '@/types/auth';
import { Conversation } from '@/types/chat';
import { StorageType } from '@/types/storage';

import {
  couchdbGetConversations,
  couchdbSaveConversations,
} from './documentBased/couchdb/conversations';
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

export const storageGetConversations = async (
  storageType: StorageType,
  user: User,
) => {
  if (storageType === StorageType.COUCHDB) {
    return await couchdbGetConversations();
  } else if (storageType === StorageType.RDBMS) {
    return await rdbmsGetConversations();
  } else {
    return localGetConversations(user);
  }
};

export const storageUpdateConversations = async (
  storageType: StorageType,
  user: User,
  conversations: Conversation[],
) => {
  if (storageType === StorageType.COUCHDB) {
    await couchdbSaveConversations(conversations);
  } else if (storageType === StorageType.RDBMS) {
    await rdbmsUpdateConversations(conversations);
  } else {
    localSaveConversations(user, conversations);
  }
};

export const storageDeleteConversations = async (
  storageType: StorageType,
  user: User,
) => {
  if (storageType === StorageType.COUCHDB) {
    await couchdbSaveConversations([]);
  } else if (storageType === StorageType.RDBMS) {
    await rdbmsDeleteConversations();
  } else {
    localDeleteConversations(user);
  }
};
