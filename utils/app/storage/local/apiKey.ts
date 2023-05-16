import { User } from '@chatbot-ui/core/types/auth';

export const localGetAPIKey = (user: User) => {
  const itemName = `apiKey-${user.email}`;
  return localStorage.getItem(itemName);
};

export const localSaveAPIKey = (user: User, apiKey: string) => {
  const itemName = `apiKey-${user.email}`;
  localStorage.setItem(itemName, apiKey);
};

export const localDeleteAPIKey = (user: User) => {
  const itemName = `apiKey-${user.email}`;
  localStorage.removeItem(itemName);
};
