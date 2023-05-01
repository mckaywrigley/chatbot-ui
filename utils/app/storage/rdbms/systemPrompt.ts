import { SystemPrompt } from '@/types/systemPrompt';

export const rdbmsCreateSystemPrompt = async (
  newSystemPrompt: SystemPrompt,
) => {
  await fetch('api/rdbms/systemPrompt', {
    method: 'POST',
    body: JSON.stringify(newSystemPrompt),
  });
};

export const rdbmsUpdateSystemPrompt = async (
  updatedSystemPrompt: SystemPrompt,
) => {
  await fetch('api/rdbms/systemPrompt', {
    method: 'PUT',
    body: JSON.stringify(updatedSystemPrompt),
  });
};

export const rdbmsDeleteSystemPrompt = async (promptId: string) => {
  await fetch('api/rdbms/systemPrompt', {
    method: 'DELETE',
    body: JSON.stringify({ system_prompt_id: promptId }),
  });
};
