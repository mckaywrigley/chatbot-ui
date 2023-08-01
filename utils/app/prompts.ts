import { PrivateAIModelID } from '@/types/privateIA';
import { Prompt } from '@/types/prompt';

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

export const savePrompts = (prompts: Prompt[]) => {
  localStorage.setItem('prompts', JSON.stringify(prompts));
};

export const defaultPrompt = (modelId: string) => {
  if (Object.keys(PrivateAIModelID).find(key => PrivateAIModelID[key as keyof typeof PrivateAIModelID] === modelId)) {
    return process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT || '';
  }
  return "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";
};