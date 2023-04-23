import { Prompt } from '@/types/prompt';

export const couchdbGetPrompts = async () => {
  const response = await fetch('api/prompts');
  return response.json() as Promise<Prompt[]>;
};

export const couchdbSavePrompts = async (updatedPrompts: Prompt[]) => {
  await fetch('api/prompts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedPrompts),
  });
};
