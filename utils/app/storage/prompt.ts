import { User } from '@/types/auth';
import { Prompt } from '@/types/prompt';
import { StorageType } from '@/types/storage';

import { couchdbSavePrompts } from './documentBased/couchdb/prompts';
import { localSavePrompts } from './documentBased/local/prompts';
import {
  rdbmsCreatePrompt,
  rdbmsDeletePrompt,
  rdbmsUpdatePrompt,
} from './rdbms/prompt';

export const storageCreatePrompt = (
  storageType: StorageType,
  user: User,
  newPrompt: Prompt,
  allPrompts: Prompt[],
) => {
  const updatedPrompts = [...allPrompts, newPrompt];

  if (storageType === StorageType.COUCHDB) {
    couchdbSavePrompts(updatedPrompts);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsCreatePrompt(newPrompt);
  } else {
    localSavePrompts(user, updatedPrompts);
  }

  return updatedPrompts;
};

export const storageUpdatePrompt = (
  storageType: StorageType,
  user: User,
  updatedPrompt: Prompt,
  allPrompts: Prompt[],
) => {
  const updatedPrompts = allPrompts.map((c) => {
    if (c.id === updatedPrompt.id) {
      return updatedPrompt;
    }

    return c;
  });

  if (storageType === StorageType.COUCHDB) {
    couchdbSavePrompts(updatedPrompts);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsUpdatePrompt(updatedPrompt);
  } else {
    localSavePrompts(user, updatedPrompts);
  }
  return {
    single: updatedPrompt,
    all: updatedPrompts,
  };
};

export const storageDeletePrompt = (
  storageType: StorageType,
  user: User,
  promptId: string,
  allPrompts: Prompt[],
) => {
  const updatedPrompts = allPrompts.filter((p) => p.id !== promptId);

  if (storageType === StorageType.COUCHDB) {
    couchdbSavePrompts(updatedPrompts);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsDeletePrompt(promptId);
  } else {
    localSavePrompts(user, updatedPrompts);
  }

  return updatedPrompts;
};
