import { Prompt } from '@/types/prompt';

export const updatePrompt = (databaseType: string, updatedPrompt: Prompt, allPrompts: Prompt[]) => {
  const updatedPrompts = allPrompts.map((c) => {
    if (c.id === updatedPrompt.id) {
      return updatedPrompt;
    }

    return c;
  });

  savePrompts(databaseType, updatedPrompts);

  return {
    single: updatedPrompt,
    all: updatedPrompts,
  };
};

export const getPrompts = async (databaseType: string) => {
  if (databaseType === 'couchdb'){
    const response = await fetch('api/prompts');
    return response.json();
  }
  return JSON.parse(localStorage.getItem('prompts') || '[]');
};

export const savePrompts = async (databaseType: string, prompts: Prompt[]) => {
  if (databaseType === 'couchdb'){
    const response = await fetch('api/prompts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompts),
      }
    );
    return response.json();
  }
  localStorage.setItem('prompts', JSON.stringify(prompts));
};
