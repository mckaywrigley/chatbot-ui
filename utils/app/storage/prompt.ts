import { User } from '@chatbot-ui/core/types/auth';
import { Prompt } from '@chatbot-ui/core/types/prompt';

import { Database } from '@chatbot-ui/core';

export const storageCreatePrompt = (
  database: Database,
  user: User,
  newPrompt: Prompt,
  allPrompts: Prompt[],
) => {
  const updatedPrompts = [...allPrompts, newPrompt];

  database.createPrompt(user, newPrompt).then((success) => {
    if (!success) {
      console.log('Failed to create prompt');
    }
  });

  return updatedPrompts;
};

export const storageUpdatePrompt = (
  database: Database,
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

  database.updatePrompt(user, updatedPrompt).then((success) => {
    if (!success) {
      console.log('Failed to update prompt');
    }
  });

  return {
    single: updatedPrompt,
    all: updatedPrompts,
  };
};

export const storageDeletePrompt = (
  database: Database,
  user: User,
  promptId: string,
  allPrompts: Prompt[],
) => {
  const updatedPrompts = allPrompts.filter((p) => p.id !== promptId);

  database.deletePrompt(user, promptId).then((success) => {
    if (!success) {
      console.log('Failed to delete prompt');
    }
  });

  return updatedPrompts;
};
