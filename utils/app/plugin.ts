import { KeyValuePair } from '@/types/data';
import { Plugin } from '@/types/plugin';

export const savePlugin = (selectedPlugin: Plugin | null) => {
  if (selectedPlugin) {
    localStorage.setItem('selectedPlugin', JSON.stringify(selectedPlugin));
    if (selectedPlugin.id === 'edgar') {
      saveEdgarPluginKeys(selectedPlugin.requiredKeys);
    }
  } else {
    localStorage.removeItem('selectedPlugin');
  }
};

export const saveEdgarPluginKeys = (requiredKeys: KeyValuePair[]) => {
  localStorage.setItem('edgarPluginKeys', JSON.stringify(requiredKeys));
};
