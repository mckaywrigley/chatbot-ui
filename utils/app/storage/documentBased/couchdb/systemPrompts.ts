import { SystemPrompt } from '@/types/systemPrompt';

export const couchdbGetSystemPrompts = async () => {
  const response = await fetch('api/systemPrompt');
  return response.json() as Promise<SystemPrompt[]>;
};

export const couchdbSaveSystemPrompts = async (
  updatedSystemPrompts: SystemPrompt[],
) => {
  await fetch('api/systemPrompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedSystemPrompts),
  });
};
