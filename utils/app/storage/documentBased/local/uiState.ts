import { User } from '@/types/auth';
import { Prompt } from '@/types/prompt';

export const localGetShowPromptBar = (user: User) => {
  const itemName = `showPromptbar-${user.id}`;
  return JSON.parse(localStorage.getItem(itemName) || '[]') as boolean;
};

export const localSaveShowPromptBar = (user: User, show: boolean) => {
  const itemName = `showPromptbar-${user.id}`;
  localStorage.setItem(itemName, JSON.stringify(show));
};

export const localGetShowChatBar = (user: User) => {
  const itemName = `showChatbar-${user.id}`;
  return JSON.parse(localStorage.getItem(itemName) || '[]') as boolean;
};

export const localSaveShowChatBar = (user: User, show: boolean) => {
  const itemName = `showChatbar-${user.id}`;
  localStorage.setItem(itemName, JSON.stringify(show));
};
