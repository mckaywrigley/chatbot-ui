import { User } from '@/types/auth';
import { StorageType } from '@/types/storage';
import { SystemPrompt } from '@/types/systemPrompt';

import { couchdbSaveSystemPrompts } from './documentBased/couchdb/systemPrompts';
import { localSaveSystemPrompts } from './documentBased/local/systemPrompts';
import {
  rdbmsCreateSystemPrompt,
  rdbmsDeleteSystemPrompt,
  rdbmsUpdateSystemPrompt,
} from './rdbms/systemPrompt';

export const storageCreateSystemPrompt = (
  storageType: StorageType,
  user: User,
  newSystemPrompt: SystemPrompt,
  allSystemPrompts: SystemPrompt[],
) => {
  const updatedSystemPrompts = [...allSystemPrompts, newSystemPrompt];

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveSystemPrompts(updatedSystemPrompts);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsCreateSystemPrompt(newSystemPrompt);
  } else {
    localSaveSystemPrompts(user, updatedSystemPrompts);
  }

  return updatedSystemPrompts;
};

export const storageUpdateSystemPrompt = (
  storageType: StorageType,
  user: User,
  updatedSystemPrompt: SystemPrompt,
  allPrompts: SystemPrompt[],
) => {
  const updatedSystemPrompts = allPrompts.map((c) => {
    if (c.id === updatedSystemPrompt.id) {
      return updatedSystemPrompt;
    }

    return c;
  });

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveSystemPrompts(updatedSystemPrompts);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsUpdateSystemPrompt(updatedSystemPrompt);
  } else {
    localSaveSystemPrompts(user, updatedSystemPrompts);
  }
  return {
    single: updatedSystemPrompt,
    all: updatedSystemPrompts,
  };
};

export const storageDeleteSystemPrompt = (
  storageType: StorageType,
  user: User,
  promptId: string,
  allPrompts: SystemPrompt[],
) => {
  const updatedSystemPrompts = allPrompts.filter((p) => p.id !== promptId);

  if (storageType === StorageType.COUCHDB) {
    couchdbSaveSystemPrompts(updatedSystemPrompts);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsDeleteSystemPrompt(promptId);
  } else {
    localSaveSystemPrompts(user, updatedSystemPrompts);
  }

  return updatedSystemPrompts;
};
