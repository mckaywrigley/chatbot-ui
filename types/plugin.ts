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
}

export enum PluginName {
  GOOGLE_SEARCH = 'Google Search',
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
};

export const PluginList = Object.values(Plugins);

export interface PluginApiOperation {
  operationId: string;
  serverUrl: string;
  apiPath: string;
  method: string;
  summary?: string;
  parameters?: [{
    name: string;
    in: string;
    description?: string;
    required?: boolean;
    schema: {
      type: string;
    }
  }];
  requestBody?: {
    required?: boolean;
    content: {
      [key: string]: {
        schema: {
          type: string;
          required?: string[];
          properties: {
            [key: string]: {
              type: string;
              description?: string;
              required?: boolean;
            }
          }
        }
      }
    }
  };
  responses?: {
    [key: string]: {
      description?: string;
      content?: {
        [key: string]: {
          schema: {
            type: string;
            required?: string[];
            properties?: {
              [key: string]: {
                type: string;
                description?: string;
              }
            }
          }
        }
      }
    }
  }
}

export interface PluginApiOperationList {
  [operationId: string]: PluginApiOperation;
}
