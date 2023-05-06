import { User } from '@/types/auth';
import { Prompt } from '@/types/prompt';

export const localGetPrompts = (user: User) => {
  const itemName = `prompts-${user.id}`;
  return JSON.parse(localStorage.getItem(itemName) || '[]') as Prompt[];
};

export const localSavePrompts = (user: User, updatedPrompts: Prompt[]) => {
  const itemName = `prompts-${user.id}`;
  localStorage.setItem(itemName, JSON.stringify(updatedPrompts));
};

export const localDeletePrompts = (user: User) => {
  const itemName = `prompts-${user.id}`;
  localStorage.removeItem(itemName);
};
