import { User } from '@/types/auth';
import { Settings } from '@/types/settings';

const STORAGE_KEY = 'settings';

export const getSettings = (user: User): Settings => {
  let settings: Settings = {
    theme: 'dark',
    defaultSystemPromptId: '0',
  };
  const itemName = `${STORAGE_KEY}-${user.id}`;
  const settingsJson = localStorage.getItem(itemName);
  if (settingsJson) {
    try {
      let savedSettings = JSON.parse(settingsJson) as Settings;
      settings = Object.assign(settings, savedSettings);
    } catch (e) {
      console.error(e);
    }
  }
  return settings;
};

export const saveSettings = (user: User, settings: Settings) => {
  const itemName = `${STORAGE_KEY}-${user.id}`;
  localStorage.setItem(itemName, JSON.stringify(settings));
};
