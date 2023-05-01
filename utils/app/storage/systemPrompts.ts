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

export const storageGetSystemPrompts = async (storageType: StorageType) => {
  if (storageType === StorageType.COUCHDB) {
    return await couchdbGetSystemPrompts();
  } else if (storageType === StorageType.RDBMS) {
    return await rdbmsGetSystemPrompts();
  } else {
    return localGetSystemPrompts();
  }
};

export const storageUpdateSystemPrompts = async (
  storageType: StorageType,
  updatedSystemPrompts: SystemPrompt[],
) => {
  if (storageType === StorageType.COUCHDB) {
    await couchdbSaveSystemPrompts(updatedSystemPrompts);
  } else if (storageType === StorageType.RDBMS) {
    await rdbmsUpdateSystemPrompts(updatedSystemPrompts);
  } else {
    localSaveSystemPrompts(updatedSystemPrompts);
  }
};
