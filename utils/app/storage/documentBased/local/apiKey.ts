import { User } from '@/types/auth';
import { Prompt } from '@/types/prompt';

export const localGetAPIKey = (user: User) => {
  const itemName = `apiKey-${user.id}`;
  return localStorage.getItem(itemName);
};

export const localSaveAPIKey = (user: User, apiKey: string) => {
  const itemName = `apiKey-${user.id}`;
  localStorage.setItem(itemName, apiKey);
};

export const localDeleteAPIKey = (user: User) => {
  const itemName = `apiKey-${user.id}`;
  localStorage.removeItem(itemName);
};
