import { User } from 'chatbot-ui-core/types/auth';
import { SystemPrompt } from 'chatbot-ui-core/types/systemPrompt';

import { Database } from 'chatbot-ui-core';

export const storageGetSystemPrompts = async (
  database: Database,
  user: User,
) => {
  return await database.getSystemPrompts(user);
};

export const storageUpdateSystemPrompts = async (
  database: Database,
  user: User,
  updatedSystemPrompts: SystemPrompt[],
) => {
  database.updateSystemPrompts(user, updatedSystemPrompts);
};
