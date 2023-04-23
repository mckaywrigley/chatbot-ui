import { Prompt } from '@/types/prompt';

export const rdbmsCreatePrompt = async (newPrompt: Prompt) => {
  await fetch('api/rdbms/prompt', {
    method: 'POST',
    body: JSON.stringify(newPrompt),
  });
};

export const rdbmsUpdatePrompt = async (updatedPrompt: Prompt) => {
  await fetch('api/rdbms/prompt', {
    method: 'PUT',
    body: JSON.stringify(updatedPrompt),
  });
};

export const rdbmsDeletePrompt = async (promptId: string) => {
  await fetch('api/rdbms/prompt', {
    method: 'DELETE',
    body: JSON.stringify({ prompt_id: promptId }),
  });
};
