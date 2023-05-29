import { Prompt } from '@/types/prompt';

import remoteStorage from '@/lib/remoteStorage';

export const updatePrompt = (updatedPrompt: Prompt, allPrompts: Prompt[]) => {
  const updatedPrompts = allPrompts.map((c) => {
    if (c.id === updatedPrompt.id) {
      return updatedPrompt;
    }

    return c;
  });

  savePrompts(updatedPrompts);

  return {
    single: updatedPrompt,
    all: updatedPrompts,
  };
};

export const savePrompts = async (prompts: Prompt[]) => {
  await remoteStorage.setItem('prompts', prompts);
};
