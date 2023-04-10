import { KeyValuePair } from './data';

export interface Plugin {
  id: PluginID;
  name: PluginName;
  requiredKeys: KeyValuePair[];
}

export interface PluginKey {
  pluginId: PluginID;
  requiredKeys: KeyValuePair[];
}

export enum PluginID {
  GOOGLE_SEARCH = 'google-search',
  LANGCHAIN_CHAT = 'langchain-chat',
}

export enum PluginName {
  GOOGLE_SEARCH = 'Google Search',
  LANGCHAIN_CHAT = 'Enhance Chat',
}

export const Plugins: Record<PluginID, Plugin> = {
  [PluginID.GOOGLE_SEARCH]: {
    id: PluginID.GOOGLE_SEARCH,
    name: PluginName.GOOGLE_SEARCH,
    requiredKeys: [
      {
        key: 'GOOGLE_API_KEY',
        value: '',
      },
      {
        key: 'GOOGLE_CSE_ID',
        value: '',
      },
    ],
  },
  [PluginID.LANGCHAIN_CHAT]: {
    id: PluginID.LANGCHAIN_CHAT,
    name: PluginName.LANGCHAIN_CHAT,
    requiredKeys: []
  }
};

export const PluginList = Object.values(Plugins);
