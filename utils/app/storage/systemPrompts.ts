import { User } from '@/types/auth';
import { StorageType } from '@/types/storage';
import { SystemPrompt } from '@/types/systemPrompt';

import {
  couchdbGetSystemPrompts,
  couchdbSaveSystemPrompts,
} from './documentBased/couchdb/systemPrompts';
import {
  localGetSystemPrompts,
  localSaveSystemPrompts,
} from './documentBased/local/systemPrompts';
import {
  rdbmsGetSystemPrompts,
  rdbmsUpdateSystemPrompts,
} from './rdbms/systemPrompts';

export const storageGetSystemPrompts = async (
  storageType: StorageType,
  user: User,
) => {
  if (storageType === StorageType.COUCHDB) {
    return await couchdbGetSystemPrompts();
  } else if (storageType === StorageType.RDBMS) {
    return await rdbmsGetSystemPrompts();
  } else {
    return localGetSystemPrompts(user);
  }
};

export const storageUpdateSystemPrompts = async (
  storageType: StorageType,
  user: User,
  updatedSystemPrompts: SystemPrompt[],
) => {
  if (storageType === StorageType.COUCHDB) {
    await couchdbSaveSystemPrompts(updatedSystemPrompts);
  } else if (storageType === StorageType.RDBMS) {
    await rdbmsUpdateSystemPrompts(updatedSystemPrompts);
  } else {
    localSaveSystemPrompts(user, updatedSystemPrompts);
  }
};
