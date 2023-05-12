import { User } from 'chatbot-ui-core/types/auth';
import { Prompt } from 'chatbot-ui-core/types/prompt';

import { Database } from 'chatbot-ui-core';

export const storageGetPrompts = async (database: Database, user: User) => {
  return await database.getPrompts(user);
};

export const storageUpdatePrompts = async (
  database: Database,
  user: User,
  updatedPrompts: Prompt[],
) => {
  await database.updatePrompts(user, updatedPrompts).then((success) => {
    if (!success) {
      console.log('Failed to update prompts');
    }
  });
};
