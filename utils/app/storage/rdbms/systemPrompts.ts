import { SystemPrompt } from '@/types/systemPrompt';

export const rdbmsGetSystemPrompts = async () => {
  const response = await fetch('api/rdbms/systemPrompts', { method: 'POST' });
  return response.json() as Promise<SystemPrompt[]>;
};

export const rdbmsUpdateSystemPrompts = async (
  updatedPrompts: SystemPrompt[],
) => {
  await fetch('api/rdbms/systemPrompts', {
    method: 'PUT',
    body: JSON.stringify(updatedPrompts),
  });
};
