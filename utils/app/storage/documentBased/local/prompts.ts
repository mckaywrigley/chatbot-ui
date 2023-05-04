import { Prompt } from '@/types/prompt';

export const localGetPrompts = () => {
  return JSON.parse(localStorage.getItem('prompts') || '[]') as Prompt[];
};

export const localSavePrompts = (updatedPrompts: Prompt[]) => {
  localStorage.setItem('prompts', JSON.stringify(updatedPrompts));
};

export const localDeletePrompts = () => {
  localStorage.removeItem('prompts');
};
