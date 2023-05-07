import { SystemPrompt } from '@/chatbot-ui-core/types/systemPrompt';
import { User } from 'chatbot-ui-core/types/auth';

import { Database } from 'chatbot-ui-core';

export const storageCreateSystemPrompt = (
  database: Database,
  user: User,
  newSystemPrompt: SystemPrompt,
  allSystemPrompts: SystemPrompt[],
) => {
  const updatedSystemPrompts = [...allSystemPrompts, newSystemPrompt];

  database.createSystemPrompt(user, newSystemPrompt);

  return updatedSystemPrompts;
};

export const storageUpdateSystemPrompt = (
  database: Database,
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

  database.updateSystemPrompt(user, updatedSystemPrompt);

  return {
    single: updatedSystemPrompt,
    all: updatedSystemPrompts,
  };
};

export const storageDeleteSystemPrompt = (
  database: Database,
  user: User,
  promptId: string,
  allPrompts: SystemPrompt[],
) => {
  const updatedSystemPrompts = allPrompts.filter((p) => p.id !== promptId);

  database.deleteSystemPrompt(user, promptId);

  return updatedSystemPrompts;
};
