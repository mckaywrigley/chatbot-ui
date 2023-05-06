import { User } from '@/types/auth';
import { SystemPrompt } from '@/types/systemPrompt';

export const localGetSystemPrompts = (user: User) => {
  const itemName = `system_prompts-${user.id}`;
  return JSON.parse(localStorage.getItem(itemName) || '[]') as SystemPrompt[];
};

export const localSaveSystemPrompts = (
  user: User,
  updatedSystemPrompts: SystemPrompt[],
) => {
  const itemName = `system_prompts-${user.id}`;
  localStorage.setItem(itemName, JSON.stringify(updatedSystemPrompts));
};

export const localDeleteSystemPrompts = (user: User) => {
  const itemName = `system_prompts-${user.id}`;
  localStorage.removeItem(itemName);
};
