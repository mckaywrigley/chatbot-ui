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
  EDGAR = 'edgar',
}

export enum PluginName {
  GOOGLE_SEARCH = 'Google Search',
  EDGAR = 'FinChat (EDGAR)',
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
  [PluginID.EDGAR]: {
    id: PluginID.EDGAR,
    name: PluginName.EDGAR,
    requiredKeys: [
      {
        key: 'symbols',
        value: [],
      },
      {
        key: 'formTypes',
        value: [],
      },
      {
        key: 'startDate',
        value: 0,
      },
      {
        key: 'endDate',
        value: 0,
      },
    ],
  },
};

export const PluginList = Object.values(Plugins);
