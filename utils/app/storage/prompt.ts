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
  newPrompt: Prompt,
  allPrompts: Prompt[],
) => {
  const updatedPrompts = [...allPrompts, newPrompt];

  if (storageType === StorageType.COUCHDB) {
    couchdbSavePrompts(updatedPrompts);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsCreatePrompt(newPrompt);
  } else {
    localSavePrompts(updatedPrompts);
  }

  return updatedPrompts;
};

export const storageUpdatePrompt = (
  storageType: StorageType,
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
    localSavePrompts(updatedPrompts);
  }
  return {
    single: updatedPrompt,
    all: updatedPrompts,
  };
};

export const storageDeletePrompt = (
  storageType: StorageType,
  promptId: string,
  allPrompts: Prompt[],
) => {
  const updatedPrompts = allPrompts.filter((p) => p.id !== promptId);

  if (storageType === StorageType.COUCHDB) {
    couchdbSavePrompts(updatedPrompts);
  } else if (storageType === StorageType.RDBMS) {
    rdbmsDeletePrompt(promptId);
  } else {
    localSavePrompts(updatedPrompts);
  }

  return updatedPrompts;
};
