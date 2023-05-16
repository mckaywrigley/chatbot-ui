import { User } from '@chatbot-ui/core/types/auth';
import { SystemPrompt } from '@chatbot-ui/core/types/system-prompt';

import { Database } from '@chatbot-ui/core';

export const storageCreateSystemPrompt = (
  database: Database,
  user: User,
  newSystemPrompt: SystemPrompt,
  allSystemPrompts: SystemPrompt[],
) => {
  const updatedSystemPrompts = [...allSystemPrompts, newSystemPrompt];

  database.createSystemPrompt(user, newSystemPrompt).then((success) => {
    if (!success) {
      console.log('Failed to create system prompt');
    }
  });

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

  database.updateSystemPrompt(user, updatedSystemPrompt).then((success) => {
    if (!success) {
      console.log('Failed to update system prompt');
    }
  });

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

  database.deleteSystemPrompt(user, promptId).then((success) => {
    if (!success) {
      console.log('Failed to delete system prompt');
    }
  });

  return updatedSystemPrompts;
};
