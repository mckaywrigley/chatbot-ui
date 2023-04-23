import { Prompt } from '@/types/prompt';

export const rdbmsGetPrompts = async () => {
  const response = await fetch('api/rdbms/prompts', { method: 'POST' });
  return response.json() as Promise<Prompt[]>;
};

export const rdbmsUpdatePrompts = async (updatedPrompts: Prompt[]) => {
  await fetch('api/rdbms/prompts', {
    method: 'PUT',
    body: JSON.stringify(updatedPrompts),
  });
};
