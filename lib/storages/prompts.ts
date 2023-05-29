import { Prompt } from '@/types/prompt';

export const promptsGET = async () => {
  const response = await fetch('/api/prompts');
  const prompts = await response.json();
  return prompts;
};

export const promptsPOST = async (prompts: Prompt[]) => {
  const body = prompts.map((prompt) => ({
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    content: prompt.content,
    model: prompt.model,
    folderId: prompt.folderId,
  }));

  await fetch('/api/prompts', {
    method: 'POST',
    body: JSON.stringify({ prompts: body }),
  });
};

export const promptsDELETE = async () => {
  await fetch('/api/prompts', {
    method: 'DELETE',
  });
};
