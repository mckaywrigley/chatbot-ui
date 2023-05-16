import { PluginKey } from '@/types/plugin';
import { User } from '@chatbot-ui/core/types/auth';

export const localGetPluginKeys = (user: User) => {
  const itemName = `pluginKeys-${user.email}`;
  return JSON.parse(localStorage.getItem(itemName) || '[]') as PluginKey[];
};

export const localSavePluginKeys = (user: User, pluginKeys: PluginKey[]) => {
  const itemName = `pluginKeys-${user.email}`;
  localStorage.setItem(itemName, JSON.stringify(pluginKeys));
};

export const localDeletePluginKeys = (user: User) => {
  const itemName = `pluginKeys-${user.email}`;
  localStorage.removeItem(itemName);
};
