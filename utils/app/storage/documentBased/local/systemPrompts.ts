import { SystemPrompt } from '@/types/systemPrompt';

export const localGetSystemPrompts = () => {
  return JSON.parse(
    localStorage.getItem('system_prompts') || '[]',
  ) as SystemPrompt[];
};

export const localSaveSystemPrompts = (
  updatedSystemPrompts: SystemPrompt[],
) => {
  localStorage.setItem('system_prompts', JSON.stringify(updatedSystemPrompts));
};

export const localDeleteSystemPrompts = () => {
  localStorage.removeItem('system_prompts');
};
